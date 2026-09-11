import { createHttp } from "./http.ts";

export type { Activity, WaitListener } from "./http.ts";
export { ServiceError } from "./http.ts";

/**
 * Accès à la Géoplateforme IGN.
 *
 * Les deux seaux sont dimensionnés sur les plafonds annoncés : le calcul
 * d'itinéraire est limité bien plus bas que le géocodage (de l'ordre de
 * 5 req/s contre 50).
 */
const ign = createHttp({
  services: {
    geocode: { base: "https://data.geopf.fr", minGap: 50, maxConcurrent: 4 },
    route: { base: "https://data.geopf.fr", minGap: 250, maxConcurrent: 2 },
  },
  errors: {
    unreachable: (service) =>
      `Service IGN injoignable (${service === "route" ? "itinéraire" : "géocodage"})`,
    saturated: "Le service IGN est saturé, réessayez dans quelques instants.",
    status: (code) => `Le service IGN a répondu ${code}`,
    unknown: "Erreur du service IGN",
  },
  /** L'API répond parfois en HTTP 200 avec un corps `{ error: { message } }`. */
  errorInBody: (body) => {
    if (!body || typeof body !== "object") return null;
    const { error } = body as { error?: { message?: string } };
    return error ? (error.message?.trim() ?? "") : null;
  },
});

export const { getJSON, onWait, onActivity } = ign;
