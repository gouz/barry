/** Coordonnée géographique `[longitude, latitude]`, en degrés (EPSG:4326). */
export type Coord = readonly [lon: number, lat: number];

/**
 * Cadre géographique `[[latMin, lonMin], [latMax, lonMax]]`.
 *
 * Attention : l'ordre est latitude d'abord, à l'inverse de {@link Coord}.
 * C'est la convention historique de l'appli, conservée parce que les
 * permaliens déjà partagés en dépendent.
 */
export type Box = readonly [
  sw: readonly [number, number],
  ne: readonly [number, number],
];

/** Optimise-t-on le trajet sur la durée ou sur la distance ? */
export type CalcMode = "time" | "distance";

/** Mode de déplacement, tel qu'attendu par l'API Géoplateforme. */
export type Transport = "car" | "pedestrian";

/** Identifiant d'une méthode de calcul du point de rencontre. */
export type MethodId = "longMiddle" | "average" | "center";

export interface MethodMeta {
  readonly label: string;
  readonly color: string;
  /** Poids de la méthode dans la moyenne finale. */
  readonly weight: number;
}

/** Un tronçon élémentaire d'itinéraire. */
export interface RouteStep {
  readonly distance: number;
  readonly duration: number;
  readonly coordinates: readonly Coord[];
}

/** Itinéraire calculé entre deux points. */
export interface Route {
  readonly distance: number;
  readonly duration: number;
  readonly box: Box;
  readonly geometry: GeoJSONLineString;
  readonly steps: readonly RouteStep[];
}

export interface GeoJSONLineString {
  readonly type: "LineString";
  readonly coordinates: readonly (readonly number[])[];
}

/** Une commune identifiée par géocodage inverse. */
export interface City {
  readonly name: string;
  readonly coord: Coord;
}
