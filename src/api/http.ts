/**
 * Client HTTP commun aux différents fournisseurs de données.
 *
 * La Géoplateforme, Photon et OSRM ne partagent ni leur domaine ni leur
 * vocabulaire, mais ils posent tous les trois le même problème : un service
 * public gratuit qu'il faut interroger sans le saturer, et dont les refus
 * temporaires ne doivent pas remonter à l'utilisateur. Ce module tient cette
 * discipline — cadence, relance, cache — et laisse chaque fournisseur décrire
 * ses adresses et ses messages.
 */

/**
 * Temps total qu'une requête accepte de patienter avant d'abandonner.
 *
 * Un 429 n'est pas une erreur mais une invitation à ralentir : on attend et on
 * rejoue, pour que l'utilisateur ne voie jamais le refus. Seul un service
 * durablement saturé finit par remonter une erreur.
 */
const WAIT_BUDGET = 60_000;
const BASE_BACKOFF = 1_000;
const MAX_BACKOFF = 20_000;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** Préfixe des entrées de cache ; à faire évoluer si le format des réponses change. */
const CACHE_PREFIX = "barry:cache:v1:";
/**
 * Au-delà de cette taille, la réponse n'est gardée qu'en mémoire : un itinéraire
 * détaillé pèse lourd et le quota de `sessionStorage` est vite atteint.
 */
const MAX_PERSIST = 512_000;

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type WaitListener = (wait: {
  service: string;
  attempt: number;
  delay: number;
  status?: number;
}) => void;

export interface Activity {
  /** Requêtes en cours, cache exclu. */
  readonly running: number;
  /** Instant jusqu'auquel les appels sont suspendus, ou 0 si la voie est libre. */
  readonly throttledUntil: number;
}

/** Description d'un service distant : son adresse et la cadence qu'il tolère. */
export interface ServiceConfig {
  readonly base: string;
  /** Millisecondes entre deux départs de requête. */
  readonly minGap: number;
  readonly maxConcurrent: number;
}

export interface HttpConfig<Service extends string> {
  /**
   * Un seau par service, et non un pour toute l'application : les limites
   * diffèrent d'un ordre de grandeur entre géocodage et calcul d'itinéraire, et
   * un 429 sur l'un n'a aucune raison de ralentir l'autre.
   */
  readonly services: Readonly<Record<Service, ServiceConfig>>;
  readonly errors: {
    unreachable(service: Service): string;
    readonly saturated: string;
    status(code: number): string;
    readonly unknown: string;
  };
  /**
   * Certains services répondent en HTTP 200 avec une erreur dans le corps.
   * Renvoyer le message la décrit ; `null` signifie que la réponse est bonne.
   */
  errorInBody?(body: unknown): string | null;
}

export interface Http<Service extends string> {
  getJSON<T>(
    service: Service,
    path: string,
    params: Record<string, string | number>,
    signal?: AbortSignal,
  ): Promise<T>;
  onWait(listener: WaitListener): () => void;
  /** S'abonne à l'activité réseau ; l'état courant est livré immédiatement. */
  onActivity(listener: (activity: Activity) => void): () => void;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/**
 * Cadence les appels d'un service : au plus `maxConcurrent` requêtes en vol, et
 * `minGap` millisecondes entre deux départs.
 */
function limiter(minGap: number, maxConcurrent: number) {
  let active = 0;
  let nextSlot = 0;
  /** Pause imposée par un 429 : elle vaut pour tout le service, pas pour la seule requête refusée. */
  let blockedUntil = 0;
  const waiting: (() => void)[] = [];

  function release(): void {
    active--;
    waiting.shift()?.();
  }

  return {
    async acquire(signal?: AbortSignal): Promise<void> {
      if (active >= maxConcurrent) {
        await new Promise<void>((resolve) => waiting.push(resolve));
      }
      active++;
      try {
        // Une requête qui dormait déjà doit prendre en compte une pause
        // survenue entre-temps : sans cette boucle, elle repartirait pendant le
        // refroidissement et récolterait un nouveau 429.
        for (;;) {
          const now = Date.now();
          const slot = Math.max(now, nextSlot, blockedUntil);
          nextSlot = slot + minGap;
          if (slot > now) await sleep(slot - now, signal);
          if (Date.now() >= blockedUntil) return;
        }
      } catch (cause) {
        release();
        throw cause;
      }
    },
    release,
    /** Suspend le service, après un 429 ou un 503. */
    cooldown(ms: number): void {
      blockedUntil = Math.max(blockedUntil, Date.now() + ms);
    },
  };
}

function session(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    // Stockage refusé (navigation privée, cookies bloqués) : cache mémoire seul.
    return null;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  const seconds = header ? Number(header) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0)
    return Math.min(seconds * 1_000, MAX_BACKOFF);

  const exponential = BASE_BACKOFF * 2 ** (attempt - 1);
  return Math.min(exponential + Math.random() * 250, MAX_BACKOFF);
}

export function createHttp<Service extends string>(
  config: HttpConfig<Service>,
): Http<Service> {
  const limiters = new Map<Service, ReturnType<typeof limiter>>();
  for (const [name, service] of Object.entries(config.services) as [
    Service,
    ServiceConfig,
  ][]) {
    limiters.set(name, limiter(service.minGap, service.maxConcurrent));
  }

  const waitListeners = new Set<WaitListener>();
  const activityListeners = new Set<(activity: Activity) => void>();

  let running = 0;
  let throttledUntil = 0;

  function notifyActivity(): void {
    const activity: Activity = { running, throttledUntil };
    for (const listener of activityListeners) listener(activity);
  }

  /**
   * Cache des réponses, par URL complète.
   *
   * En mémoire pour la session de calcul, et recopié dans `sessionStorage` afin
   * qu'un rechargement de permalien ou une nouvelle tentative après un 429 ne
   * rejoue pas les mêmes requêtes.
   */
  const memory = new Map<string, unknown>();
  /** Requêtes en vol, pour que deux appels identiques simultanés n'en fassent qu'un. */
  const inflight = new Map<string, Promise<unknown>>();

  function cached<T>(key: string): { value: T } | null {
    if (memory.has(key)) return { value: memory.get(key) as T };

    const store = session();
    const raw = store?.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as T;
      memory.set(key, value);
      return { value };
    } catch {
      store?.removeItem(CACHE_PREFIX + key);
      return null;
    }
  }

  function remember(key: string, value: unknown): void {
    memory.set(key, value);

    const store = session();
    if (!store) return;
    const raw = JSON.stringify(value);
    if (raw.length > MAX_PERSIST) return;
    try {
      store.setItem(CACHE_PREFIX + key, raw);
    } catch {
      // Quota atteint : on vide nos entrées et on repartira de zéro.
      for (let i = store.length - 1; i >= 0; i--) {
        const existing = store.key(i);
        if (existing?.startsWith(CACHE_PREFIX)) store.removeItem(existing);
      }
    }
  }

  /**
   * Une requête, avec relances sur les statuts temporaires.
   *
   * Un service peut aussi refuser en répondant 200 : `errorInBody` le détecte.
   */
  async function request<T>(
    url: URL,
    service: Service,
    signal?: AbortSignal,
  ): Promise<T> {
    // biome-ignore lint/style/noNonNullAssertion: un seau par service déclaré
    const bucket = limiters.get(service)!;
    let waited = 0;

    for (let attempt = 1; ; attempt++) {
      await bucket.acquire(signal);

      let response: Response;
      let body: T | undefined;
      try {
        try {
          response = await fetch(url, signal ? { signal } : {});
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === "AbortError")
            throw cause;
          throw new ServiceError(config.errors.unreachable(service));
        }
        if (response.ok) body = (await response.json()) as T;
      } finally {
        bucket.release();
      }

      if (!response.ok) {
        const delay = retryDelay(response, attempt);
        if (!RETRYABLE.has(response.status) || waited + delay > WAIT_BUDGET) {
          throw new ServiceError(
            response.status === 429
              ? config.errors.saturated
              : config.errors.status(response.status),
            response.status,
          );
        }

        waited += delay;
        bucket.cooldown(delay);
        throttledUntil = Math.max(throttledUntil, Date.now() + delay);
        notifyActivity();
        for (const listener of waitListeners)
          listener({ service, attempt, delay, status: response.status });

        await sleep(delay, signal);
        if (Date.now() >= throttledUntil) {
          throttledUntil = 0;
          notifyActivity();
        }
        continue;
      }

      const complaint = config.errorInBody?.(body) ?? null;
      if (complaint !== null)
        throw new ServiceError(complaint || config.errors.unknown);
      return body as T;
    }
  }

  return {
    getJSON<T>(
      service: Service,
      path: string,
      params: Record<string, string | number>,
      signal?: AbortSignal,
    ): Promise<T> {
      const url = new URL(path, config.services[service].base);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
      const key = url.toString();

      const hit = cached<T>(key);
      if (hit) return Promise.resolve(hit.value);

      // Sans `signal`, la promesse est partageable : l'abandon d'un appelant ne
      // peut pas faire échouer les autres. Avec, chacun garde la sienne.
      const shared = signal ? undefined : inflight.get(key);
      if (shared) return shared as Promise<T>;

      running++;
      notifyActivity();
      const task = request<T>(url, service, signal)
        .then((value) => {
          remember(key, value);
          return value;
        })
        .finally(() => {
          running--;
          notifyActivity();
        });
      if (!signal) {
        inflight.set(key, task);
        task.catch(() => {}).finally(() => inflight.delete(key));
      }
      return task;
    },

    onWait(listener) {
      waitListeners.add(listener);
      return () => waitListeners.delete(listener);
    },

    onActivity(listener) {
      activityListeners.add(listener);
      listener({ running, throttledUntil });
      return () => activityListeners.delete(listener);
    },
  };
}
