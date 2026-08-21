import type { Coord } from "../types.ts";
import { getJSON } from "./client.ts";

/**
 * Autocomplétion d'adresses.
 *
 * Le service de complétion renvoie la position de chaque proposition : retenir
 * une suggestion ne coûte donc aucune requête supplémentaire, là où la saisie
 * libre demande un géocodage. C'est ce qui rend l'autocomplétion moins chère
 * que la frappe, et non l'inverse.
 */

/** Nombre de propositions demandées : au-delà, la liste ne se lit plus. */
const LIMIT = 7;

/**
 * Écart en degrés en deçà duquel deux propositions de même nom désignent le
 * même lieu (~5 km).
 *
 * Les deux index de l'API se recouvrent : « Lyon » revient une fois comme
 * commune et une fois comme entrée d'adresse, à quelques centaines de mètres.
 * Deux communes homonymes véritablement distinctes, elles, sont bien plus
 * éloignées.
 */
const SAME_PLACE = 0.05;

export interface Suggestion {
  /** Texte réinjecté dans le champ, et clé d'unicité de la liste. */
  readonly label: string;
  /** Tête de ligne : le nom propre du lieu. */
  readonly name: string;
  /** Second plan : code postal et commune, quand la proposition en a. */
  readonly detail: string;
  /** Nature du lieu en un mot, pour distinguer la commune du lieu-dit homonyme. */
  readonly kind: string;
  /** Position déjà connue, à reprendre telle quelle. */
  readonly coord: Coord;
}

interface CompletionResult {
  x?: number;
  y?: number;
  fulltext?: string;
  kind?: string;
  poiType?: string[];
}

interface CompletionResponse {
  results?: CompletionResult[];
}

/** Traduction des natures renvoyées par l'API en un mot du vocabulaire courant. */
const KINDS: Record<string, string> = {
  housenumber: "adresse",
  street: "rue",
  municipality: "commune",
  administratif: "commune",
  locality: "lieu-dit",
};

function kindOf({ kind, poiType }: CompletionResult): string {
  const [first] = poiType ?? [];
  if (poiType?.includes("commune")) return "commune";
  // « lieu-dit habité », « zone d'habitation » : le premier mot suffit à
  // distinguer, et tient dans la colonne.
  if (first) return first.split(" ")[0] ?? first;
  return KINDS[kind ?? ""] ?? "lieu";
}

export async function complete(
  text: string,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const { results } = await getJSON<CompletionResponse>(
    "/geocodage/completion",
    {
      text,
      type: "StreetAddress,PositionOfInterest",
      maximumResponses: LIMIT,
    },
    signal,
  );

  const suggestions: Suggestion[] = [];
  for (const result of results ?? []) {
    const { x, y, fulltext } = result;
    if (x === undefined || y === undefined || !fulltext) continue;

    // « 12 Rue de la Paix, 50100 Cherbourg » : le nom d'un côté, sa localisation
    // de l'autre. Les communes n'ont que la première moitié.
    const comma = fulltext.indexOf(", ");
    const name = comma === -1 ? fulltext : fulltext.slice(0, comma);
    const duplicate = suggestions.some(
      (kept) =>
        kept.name === name &&
        Math.abs(kept.coord[0] - x) < SAME_PLACE &&
        Math.abs(kept.coord[1] - y) < SAME_PLACE,
    );
    if (duplicate) continue;

    suggestions.push({
      label: fulltext,
      name,
      detail: comma === -1 ? "" : fulltext.slice(comma + 2),
      kind: kindOf(result),
      coord: [x, y],
    });
  }
  return suggestions;
}
