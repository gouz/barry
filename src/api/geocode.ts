import type { City, Coord } from "../types.ts";
import { getJSON, ServiceError } from "./client.ts";

interface GeocodeFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    toponym?: string;
    label?: string;
    city?: string | string[];
    extrafields?: { cleabs?: string };
  };
}

interface FeatureCollection {
  features: GeocodeFeature[];
}

/** Géocode une adresse libre en coordonnées. */
export async function geocode(
  address: string,
  signal?: AbortSignal,
): Promise<Coord> {
  const { features } = await getJSON<FeatureCollection>(
    "geocode",
    "/geocodage/search",
    { q: address, index: "address", limit: 1 },
    signal,
  );

  const first = features[0];
  if (!first) throw new ServiceError(`Adresse introuvable : « ${address} »`);
  const [lon, lat] = first.geometry.coordinates;
  return [lon, lat];
}

/**
 * Cherche la commune la plus proche d'un point.
 *
 * L'API ne sait pas filtrer sur « commune » directement : on demande les POI
 * les plus proches et on retient le premier dont le `cleabs` est une commune.
 * Renvoie `null` si aucune commune n'est trouvée dans le voisinage.
 */
export async function findNearestCity(
  point: Coord,
  signal?: AbortSignal,
): Promise<City | null> {
  const [lon, lat] = point;
  const { features } = await getJSON<FeatureCollection>(
    "geocode",
    "/geocodage/reverse",
    { lon, lat, index: "poi", limit: 20 },
    signal,
  );

  for (const feature of features) {
    const { extrafields, toponym, label, city } = feature.properties;
    if (!extrafields?.cleabs?.startsWith("COMMUNE_")) continue;

    const name = toponym ?? label ?? (Array.isArray(city) ? city[0] : city);
    const [cityLon, cityLat] = feature.geometry.coordinates;
    return { name: name ?? "cette commune", coord: [cityLon, cityLat] };
  }
  return null;
}
