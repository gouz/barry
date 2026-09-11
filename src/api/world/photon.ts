import type { City, Coord, Suggestion } from "../../types.ts";
import { getJSON, ServiceError } from "./client.ts";

/**
 * Géocodage mondial par Photon (Komoot), bâti sur OpenStreetMap.
 *
 * Photon est conçu pour la frappe au clavier : il répond sur des mots
 * incomplets et livre la position de chaque proposition. Comme pour l'IGN,
 * retenir une suggestion ne coûte donc aucune requête supplémentaire.
 */

/** Nombre de propositions demandées : au-delà, la liste ne se lit plus. */
const LIMIT = 7;

/**
 * Écart en degrés en deçà duquel deux propositions de même nom désignent le
 * même lieu (~5 km).
 *
 * Une ville revient souvent deux fois, comme lieu et comme limite
 * administrative, à quelques centaines de mètres près. Deux homonymes
 * véritablement distincts, eux, sont bien plus éloignés.
 */
const SAME_PLACE = 0.05;

/**
 * Rayon de recherche de la ville la plus proche, en kilomètres.
 *
 * Sans rayon explicite, Photon ne regarde qu'aux alentours immédiats et ne
 * trouve rien dès que le point tombe entre deux communes.
 */
const CITY_RADIUS = 30;

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

/** Traduction des natures renvoyées par Photon en un mot du vocabulaire courant. */
const KINDS: Record<string, string> = {
  house: "address",
  street: "street",
  locality: "locality",
  district: "district",
  city: "city",
  county: "county",
  state: "state",
  country: "country",
  other: "place",
};

function kindOf({ osm_key, osm_value, type }: PhotonProperties): string {
  // La nomenclature des lieux distingue « city », « town » et « village » là où
  // `type` les regroupe : on garde le mot le plus précis quand il existe.
  if (osm_key === "place" && osm_value) return osm_value.replace(/_/g, " ");
  return KINDS[type ?? ""] ?? type ?? "place";
}

/** Le nom propre du lieu, ou son adresse quand il n'en a pas. */
function nameOf(properties: PhotonProperties): string {
  const { name, housenumber, street, city, state, country } = properties;
  const address = [housenumber, street].filter(Boolean).join(" ");
  return name || address || city || state || country || "";
}

/** Ce qui situe le lieu : sa ville, sa région, son pays — sans répéter son nom. */
function detailOf(properties: PhotonProperties, name: string): string {
  const { city, county, state, country } = properties;
  const parts: string[] = [];
  for (const part of [city ?? county, state, country]) {
    if (part && part !== name && !parts.includes(part)) parts.push(part);
  }
  return parts.join(", ");
}

export async function complete(
  text: string,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const { features } = await getJSON<PhotonResponse>(
    "photon",
    "/api/",
    { q: text, limit: LIMIT, lang: "en" },
    signal,
  );

  const suggestions: Suggestion[] = [];
  for (const feature of features ?? []) {
    const [lon, lat] = feature.geometry.coordinates;
    const name = nameOf(feature.properties);
    if (!name) continue;

    const duplicate = suggestions.some(
      (kept) =>
        kept.name === name &&
        Math.abs(kept.coord[0] - lon) < SAME_PLACE &&
        Math.abs(kept.coord[1] - lat) < SAME_PLACE,
    );
    if (duplicate) continue;

    const detail = detailOf(feature.properties, name);
    suggestions.push({
      label: detail ? `${name}, ${detail}` : name,
      name,
      detail,
      kind: kindOf(feature.properties),
      coord: [lon, lat],
    });
  }
  return suggestions;
}

/** Géocode une adresse libre en coordonnées. */
export async function geocode(
  address: string,
  signal?: AbortSignal,
): Promise<Coord> {
  const { features } = await getJSON<PhotonResponse>(
    "photon",
    "/api/",
    { q: address, limit: 1, lang: "en" },
    signal,
  );

  const first = features?.[0];
  if (!first) throw new ServiceError(`Address not found: “${address}”`);
  const [lon, lat] = first.geometry.coordinates;
  return [lon, lat];
}

/**
 * Cherche la ville la plus proche d'un point.
 *
 * La couche `city` de Photon rassemble villes, bourgs et villages : c'est
 * l'équivalent mondial de la commune française. Renvoie `null` quand le point
 * tombe loin de tout — en plein désert ou au milieu d'une mer.
 */
export async function findNearestCity(
  point: Coord,
  signal?: AbortSignal,
): Promise<City | null> {
  const [lon, lat] = point;
  const { features } = await getJSON<PhotonResponse>(
    "photon",
    "/reverse",
    { lon, lat, layer: "city", limit: 1, radius: CITY_RADIUS, lang: "en" },
    signal,
  );

  const first = features?.[0];
  if (!first) return null;
  const [cityLon, cityLat] = first.geometry.coordinates;
  return {
    name: nameOf(first.properties) || "this place",
    coord: [cityLon, cityLat],
  };
}
