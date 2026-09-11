import { METHODS } from "../config.ts";
import type { Texts } from "../i18n/texts.ts";
import type { Address } from "../state.ts";
import type {
  CalcMode,
  Coord,
  MethodId,
  RouteFn,
  Transport,
} from "../types.ts";
import { averageCoord, boxCenter } from "./geometry.ts";
import { longMiddle } from "./longMiddle.ts";

type Located = Address & { coord: Coord };

export interface MeetingPointOptions {
  mode: CalcMode;
  transport: Transport;
  avoidMotorways: boolean;
  /** Fournisseur d'itinéraires : l'IGN en France, OSRM dans le monde. */
  route: RouteFn;
  texts: Texts;
  log: (message: string, detailed?: boolean) => void;
}

export interface MeetingPoint {
  /** Résultat pondéré des trois méthodes. */
  readonly coord: Coord;
  /** Point proposé par chaque méthode, pour affichage sur la carte. */
  readonly byMethod: ReadonlyMap<MethodId, Coord>;
}

/**
 * Combine les trois méthodes en un point de rencontre.
 *
 * À deux villes seulement, la moyenne et le centre du cadre retombent sur le
 * milieu géométrique du segment : les pondérer n'apporterait rien, on garde
 * donc uniquement le mi-chemin réel.
 */
export async function meetingPoint(
  addresses: readonly Located[],
  options: MeetingPointOptions,
): Promise<MeetingPoint> {
  const coords = addresses.map((a) => a.coord);
  const longMiddleCoord = await longMiddle(addresses, options);

  if (addresses.length <= 2) {
    return {
      coord: longMiddleCoord,
      byMethod: new Map([["longMiddle", longMiddleCoord]]),
    };
  }

  options.log(options.texts.averaging, true);
  options.log(options.texts.framing, true);

  const byMethod = new Map<MethodId, Coord>([
    ["longMiddle", longMiddleCoord],
    ["average", averageCoord(coords)],
    ["center", boxCenter(coords)],
  ]);

  options.log(options.texts.weighting, true);

  let lon = 0;
  let lat = 0;
  let total = 0;
  for (const [id, coord] of byMethod) {
    const { weight } = METHODS[id];
    lon += coord[0] * weight;
    lat += coord[1] * weight;
    total += weight;
  }

  return { coord: [lon / total, lat / total], byMethod };
}
