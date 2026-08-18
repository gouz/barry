const BASE = "https://data.geopf.fr";

const MIN_GAP = 150;
const MAX_CONCURRENT = 2;
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF = 1_000;
const MAX_BACKOFF = 20_000;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

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

let active = 0;
let nextSlot = 0;
const waiting: (() => void)[] = [];

async function acquire(signal?: AbortSignal): Promise<void> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active++;
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_GAP;
  if (slot > now) {
    try {
      await sleep(slot - now, signal);
    } catch (cause) {
      release();
      throw cause;
    }
  }
}

function release(): void {
  active--;
  waiting.shift()?.();
}

function cooldown(ms: number): void {
  nextSlot = Math.max(nextSlot, Date.now() + ms);
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  const seconds = header ? Number(header) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0)
    return Math.min(seconds * 1_000, MAX_BACKOFF);

  const exponential = BASE_BACKOFF * 2 ** (attempt - 1);
  return Math.min(exponential + Math.random() * 250, MAX_BACKOFF);
}

/**
 * Appelle la Géoplateforme IGN et renvoie le JSON.
 *
 * L'API répond parfois en HTTP 200 avec un corps `{ error: { message } }`,
 * d'où la double vérification.
 */
export async function getJSON<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; ; attempt++) {
    await acquire(signal);

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
      release();
    }

    if (!response.ok) {
      const retryable = RETRYABLE.has(response.status);
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        throw new GeoplateformeError(
          response.status === 429
            ? "Le service IGN est saturé, réessayez dans quelques instants."
            : `Le service IGN a répondu ${response.status}`,
          response.status,
        );
      }

      const delay = retryDelay(response, attempt);
      cooldown(delay);
      for (const listener of listeners)
        listener({ path, attempt, delay, status: response.status });
      await sleep(delay, signal);
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
