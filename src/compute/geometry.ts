import type { Box, Coord } from "../types.ts";

/** Cadre englobant un ensemble de points, en `[[lat, lon], [lat, lon]]`. */
export function boundingBox(coords: readonly Coord[]): Box {
  if (coords.length === 0) throw new Error("boundingBox() sans coordonnées");

  let lonMin = Number.POSITIVE_INFINITY;
  let lonMax = Number.NEGATIVE_INFINITY;
  let latMin = Number.POSITIVE_INFINITY;
  let latMax = Number.NEGATIVE_INFINITY;

  for (const [lon, lat] of coords) {
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  }
  return [
    [latMin, lonMin],
    [latMax, lonMax],
  ];
}

/** Moyenne arithmétique des coordonnées. */
export function averageCoord(coords: readonly Coord[]): Coord {
  if (coords.length === 0) throw new Error("averageCoord() sans coordonnées");

  let lon = 0;
  let lat = 0;
  for (const coord of coords) {
    lon += coord[0];
    lat += coord[1];
  }
  return [lon / coords.length, lat / coords.length];
}

/** Centre du cadre englobant. */
export function boxCenter(coords: readonly Coord[]): Coord {
  const [[latMin, lonMin], [latMax, lonMax]] = boundingBox(coords);
  return [(lonMin + lonMax) / 2, (latMin + latMax) / 2];
}

/** Toutes les paires possibles, sans répétition. */
export function pairs<T>(items: readonly T[]): [T, T][] {
  const result: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      // biome-ignore lint/style/noNonNullAssertion: indices bornés par la boucle
      result.push([items[i]!, items[j]!]);
    }
  }
  return result;
}

const EARTH_RADIUS = 6_371_000;

/**
 * Distance orthodromique (« à vol d'oiseau ») entre deux points, en mètres.
 *
 * Sert à classer les paires de villes sans interroger le service d'itinéraires :
 * seules les mieux classées méritent un vrai calcul d'itinéraire.
 */
export function haversine(a: Coord, b: Coord): number {
  const toRad = Math.PI / 180;
  const [lonA, latA] = a;
  const [lonB, latB] = b;
  const dLat = (latB - latA) * toRad;
  const dLon = (lonB - lonA) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA * toRad) * Math.cos(latB * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}
