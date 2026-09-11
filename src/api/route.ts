import type {
  Box,
  Coord,
  GeoJSONLineString,
  Route,
  RouteOptions,
} from "../types.ts";
import { getJSON, ServiceError } from "./client.ts";

interface RouteResponse {
  distance: number;
  duration: number;
  /** `[lonMin, latMin, lonMax, latMax]` */
  bbox: [number, number, number, number];
  geometry: GeoJSONLineString;
  portions?: {
    steps?: {
      distance: number;
      duration: number;
      geometry: GeoJSONLineString;
    }[];
  }[];
}

/**
 * L'API Géoplateforme ne sait pas contraindre sur le péage : les seules valeurs
 * acceptées pour `waytype` sont `autoroute`, `tunnel` et `pont`. Bannir
 * l'autoroute est l'approximation la plus proche, la quasi-totalité des péages
 * français s'y trouvant.
 */
const NO_MOTORWAY = JSON.stringify({
  constraintType: "banned",
  key: "waytype",
  operator: "=",
  value: "autoroute",
});

export async function route(
  start: Coord,
  end: Coord,
  { mode, transport, avoidMotorways, withSteps = false }: RouteOptions,
  signal?: AbortSignal,
): Promise<Route> {
  const params: Record<string, string | number> = {
    resource: "bdtopo-osrm",
    start: `${start[0]},${start[1]}`,
    end: `${end[0]},${end[1]}`,
    profile: transport,
    optimization: mode === "time" ? "fastest" : "shortest",
    geometryFormat: "geojson",
    distanceUnit: "meter",
    timeUnit: "second",
    getSteps: String(withSteps),
  };
  if (avoidMotorways) params.constraints = NO_MOTORWAY;

  const data = await getJSON<RouteResponse>(
    "route",
    "/navigation/itineraire",
    params,
    signal,
  );

  const [lonMin, latMin, lonMax, latMax] = data.bbox;
  const box: Box = [
    [latMin, lonMin],
    [latMax, lonMax],
  ];

  const steps = (data.portions ?? []).flatMap(
    (portion) =>
      portion.steps?.map((step) => ({
        distance: step.distance,
        duration: step.duration,
        coordinates: step.geometry.coordinates.map(
          ([lon, lat]) => [lon, lat] as Coord,
        ) as readonly Coord[],
      })) ?? [],
  );

  if (withSteps && steps.length === 0) {
    throw new ServiceError("Itinéraire renvoyé sans détail de tronçons");
  }

  return {
    distance: data.distance,
    duration: data.duration,
    box,
    geometry: data.geometry,
    steps,
  };
}
