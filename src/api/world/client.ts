import { createHttp } from "../http.ts";

export type { Activity } from "../http.ts";
export { ServiceError } from "../http.ts";

/**
 * Accès aux services ouverts qui couvrent la planète.
 *
 * Photon (géocodage, Komoot) et OSRM (itinéraires, projet OSRM) sont deux
 * serveurs de démonstration offerts à la communauté : aucune clé, aucun quota
 * annoncé, mais une seule règle — ne pas les marteler. Les cadences ci-dessous
 * sont volontairement plus basses que celles de l'IGN, qui dimensionne ses
 * plafonds pour un usage de production.
 */
const world = createHttp({
  services: {
    photon: { base: "https://photon.komoot.io", minGap: 150, maxConcurrent: 2 },
    osrm: {
      base: "https://router.project-osrm.org",
      minGap: 350,
      maxConcurrent: 2,
    },
  },
  errors: {
    unreachable: (service) =>
      service === "osrm"
        ? "The routing service (OSRM) is unreachable."
        : "The geocoding service (Photon) is unreachable.",
    saturated: "The service is busy, please try again in a moment.",
    status: (code) => `The service answered ${code}`,
    unknown: "The service returned an error",
  },
  /**
   * OSRM annonce ses refus dans un champ `code`, y compris sur une réponse
   * réussie. Photon n'a pas ce champ : la vérification le laisse passer.
   */
  errorInBody: (body) => {
    if (!body || typeof body !== "object") return null;
    const { code, message } = body as { code?: string; message?: string };
    if (!code || code === "Ok") return null;
    return message?.trim() || code;
  },
});

export const { getJSON, onWait, onActivity } = world;
