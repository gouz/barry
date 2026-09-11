import { boundingBox } from "../../compute/geometry.ts";
import type {
  Coord,
  GeoJSONLineString,
  Route,
  RouteOptions,
  RouteStep,
} from "../../types.ts";
import { getJSON, ServiceError } from "./client.ts";

/**
 * Itinéraires mondiaux par le serveur de démonstration d'OSRM.
 *
 * Ce serveur ne sert qu'un seul profil, la voiture, et n'accepte aucune
 * contrainte d'exclusion : `transport` et `avoidMotorways` n'ont donc pas de
 * prise ici, et la page monde ne les propose pas. Il n'offre pas davantage
 * d'optimisation « au plus court » — tous ses trajets sont les plus rapides.
 * Le réglage temps/distance garde malgré tout son sens : il décide de la
 * mesure du mi-chemin et du classement des paires, que l'on calcule nous-mêmes
 * à partir du détail des tronçons.
 */

/**
 * Écart maximal toléré entre un point demandé et la route sur laquelle OSRM
 * l'accroche, en mètres.
 *
 * Quand deux points appartiennent à des réseaux routiers séparés — deux
 * continents, une île sans liaison maritime cartographiée —, OSRM ne renvoie
 * pas d'erreur : il déplace silencieusement l'un des deux sur le réseau de
 * l'autre, parfois de milliers de kilomètres, et livre un trajet qui n'a plus
 * aucun rapport avec la demande. Sans cette vérification, le trajet fantôme
 * fausserait aussi le choix du plus long parcours, sans que rien ne le signale.
 *
 * Les accrochages légitimes observés se comptent en dizaines de mètres ; les
 * faux, en centaines de kilomètres. Le seuil est donc très large.
 */
const MAX_SNAP = 25_000;

interface OsrmStep {
  distance: number;
  duration: number;
  geometry: GeoJSONLineString;
}

interface OsrmResponse {
  code: string;
  routes: {
    distance: number;
    duration: number;
    geometry: GeoJSONLineString;
    legs: { steps?: OsrmStep[] }[];
  }[];
  /** Point du réseau routier sur lequel chaque extrémité a été accrochée. */
  waypoints: { distance: number }[];
}

const place = ([lon, lat]: Coord) => `${lon},${lat}`;

export async function route(
  start: Coord,
  end: Coord,
  { withSteps = false }: RouteOptions,
  signal?: AbortSignal,
): Promise<Route> {
  const data = await getJSON<OsrmResponse>(
    "osrm",
    `/route/v1/driving/${place(start)};${place(end)}`,
    {
      overview: "full",
      geometries: "geojson",
      alternatives: "false",
      steps: String(withSteps),
    },
    signal,
  );

  const found = data.routes[0];
  if (!found) throw new ServiceError("No route found between these places.");

  if (data.waypoints.some((waypoint) => waypoint.distance > MAX_SNAP)) {
    throw new ServiceError(
      "No road connects these places: they sit on road networks that are not linked — different continents, or a sea crossing that no ferry covers.",
    );
  }

  const steps: RouteStep[] = found.legs.flatMap(
    (leg) =>
      leg.steps?.map((step) => ({
        distance: step.distance,
        duration: step.duration,
        coordinates: step.geometry.coordinates.map(
          ([lon, lat]) => [lon, lat] as Coord,
        ) as readonly Coord[],
      })) ?? [],
  );

  if (withSteps && steps.length === 0) {
    throw new ServiceError("Route returned without step details");
  }

  return {
    distance: found.distance,
    duration: found.duration,
    box: boundingBox(
      found.geometry.coordinates.map(
        ([lon, lat]) => [lon, lat] as Coord,
      ) as readonly Coord[],
    ),
    geometry: found.geometry,
    steps,
  };
}
