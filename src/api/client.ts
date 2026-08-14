const BASE = "https://data.geopf.fr";

export class GeoplateformeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeoplateformeError";
  }
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

  let response: Response;
  try {
    response = await fetch(url, signal ? { signal } : {});
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause;
    throw new GeoplateformeError(`Service IGN injoignable (${path})`);
  }

  if (!response.ok) {
    throw new GeoplateformeError(
      `Le service IGN a répondu ${response.status}`,
      response.status,
    );
  }

  const body = (await response.json()) as T & { error?: { message?: string } };
  if (body && typeof body === "object" && body.error) {
    throw new GeoplateformeError(
      body.error.message?.trim() ?? "Erreur du service IGN",
    );
  }
  return body;
}
