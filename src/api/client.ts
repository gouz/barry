const BASE = "https://data.geopf.fr";

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

export class GeoplateformeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeoplateformeError";
  }
}

export type WaitListener = (wait: {
  path: string;
  attempt: number;
  delay: number;
  status?: number;
}) => void;

const listeners = new Set<WaitListener>();

export function onWait(listener: WaitListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface Activity {
  /** Requêtes IGN en cours, cache exclu. */
  readonly running: number;
  /** Instant jusqu'auquel les appels sont suspendus, ou 0 si la voie est libre. */
  readonly throttledUntil: number;
}

const activityListeners = new Set<(activity: Activity) => void>();

let running = 0;
let throttledUntil = 0;

/** S'abonne à l'activité réseau ; l'état courant est livré immédiatement. */
export function onActivity(listener: (activity: Activity) => void): () => void {
  activityListeners.add(listener);
  listener({ running, throttledUntil });
  return () => activityListeners.delete(listener);
}

function notifyActivity(): void {
  const activity: Activity = { running, throttledUntil };
  for (const listener of activityListeners) listener(activity);
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

/**
 * Un seau par service : la Géoplateforme plafonne le calcul d'itinéraire bien
 * plus bas que le géocodage (de l'ordre de 5 req/s contre 50), et un 429 sur
 * l'un n'a aucune raison de ralentir l'autre.
 */
const ROUTE = limiter(250, 2);
const GEOCODE = limiter(50, 4);

const limiterFor = (path: string) =>
  path.startsWith("/navigation") ? ROUTE : GEOCODE;

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

function session(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    // Stockage refusé (navigation privée, cookies bloqués) : cache mémoire seul.
    return null;
  }
}

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
 * L'API répond parfois en HTTP 200 avec un corps `{ error: { message } }`,
 * d'où la double vérification.
 */
async function request<T>(
  url: URL,
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const service = limiterFor(path);
  let waited = 0;

  for (let attempt = 1; ; attempt++) {
    await service.acquire(signal);

    let response: Response;
    let body: (T & { error?: { message?: string } }) | undefined;
    try {
      try {
        response = await fetch(url, signal ? { signal } : {});
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError")
          throw cause;
        throw new GeoplateformeError(`Service IGN injoignable (${path})`);
      }
      if (response.ok) body = (await response.json()) as typeof body;
    } finally {
      service.release();
    }

    if (!response.ok) {
      const delay = retryDelay(response, attempt);
      if (!RETRYABLE.has(response.status) || waited + delay > WAIT_BUDGET) {
        throw new GeoplateformeError(
          response.status === 429
            ? "Le service IGN est saturé, réessayez dans quelques instants."
            : `Le service IGN a répondu ${response.status}`,
          response.status,
        );
      }

      waited += delay;
      service.cooldown(delay);
      throttledUntil = Math.max(throttledUntil, Date.now() + delay);
      notifyActivity();
      for (const listener of listeners)
        listener({ path, attempt, delay, status: response.status });

      await sleep(delay, signal);
      if (Date.now() >= throttledUntil) {
        throttledUntil = 0;
        notifyActivity();
      }
      continue;
    }

    if (body && typeof body === "object" && body.error) {
      throw new GeoplateformeError(
        body.error.message?.trim() ?? "Erreur du service IGN",
      );
    }
    return body as T;
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

/** Appelle la Géoplateforme IGN et renvoie le JSON, en réutilisant le cache. */
export async function getJSON<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const key = url.toString();

  const hit = cached<T>(key);
  if (hit) return hit.value;

  // Sans `signal`, la promesse est partageable : l'abandon d'un appelant ne
  // peut pas faire échouer les autres. Avec, chacun garde la sienne.
  const shared = signal ? undefined : inflight.get(key);
  if (shared) return shared as Promise<T>;

  running++;
  notifyActivity();
  const task = request<T>(url, path, signal)
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
}
