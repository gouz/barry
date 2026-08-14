import { route } from "../api/route.ts";
import type { Address } from "../state.ts";
import type { CalcMode, Coord, Route, Transport } from "../types.ts";
import { formatDistance, formatDuration, pairs } from "./geometry.ts";

type Located = Address & { coord: Coord };

export interface LongMiddleOptions {
  mode: CalcMode;
  transport: Transport;
  avoidMotorways: boolean;
  log: (message: string, detailed?: boolean) => void;
}

const cost = (r: Route, mode: CalcMode) =>
  mode === "time" ? r.duration : r.distance;

/**
 * Point situé à mi-parcours du plus long trajet entre deux des villes.
 *
 * Coût : une requête par paire (n·(n−1)/2) pour identifier le plus long trajet,
 * puis une seule requête supplémentaire — avec le détail des tronçons — sur la
 * paire retenue. Demander les tronçons dès le premier passage alourdirait
 * chaque réponse sans servir aux paires écartées.
 */
export async function longMiddle(
  addresses: readonly Located[],
  { mode, transport, avoidMotorways, log }: LongMiddleOptions,
): Promise<Coord> {
  log("Je calcule tous les chemins !", true);

  const options = { mode, transport, avoidMotorways };
  const combinations = pairs(addresses);
  const routes = await Promise.all(
    combinations.map(([a, b]) => route(a.coord, b.coord, options)),
  );

  let best = 0;
  for (const [index, current] of routes.entries()) {
    // biome-ignore lint/style/noNonNullAssertion: même longueur que `routes`
    const [from, to] = combinations[index]!;
    log(
      `Entre « ${from.label} » et « ${to.label} » il y a ${formatDistance(current.distance)} en ${formatDuration(current.duration)}`,
      true,
    );
    // biome-ignore lint/style/noNonNullAssertion: `best` est un index valide
    if (cost(current, mode) > cost(routes[best]!, mode)) best = index;
  }

  // biome-ignore lint/style/noNonNullAssertion: même longueur que `routes`
  const [from, to] = combinations[best]!;
  log(
    `Le trajet le plus long (en ${mode === "time" ? "temps" : "distance"}) est donc entre « ${from.label} » et « ${to.label} »`,
    true,
  );

  log("Je calcule le point à mi-temps.", true);
  const detailed = await route(from.coord, to.coord, {
    ...options,
    withSteps: true,
  });
  const point = midpointOf(detailed, mode);
  log("Le point est trouvé.", true);
  return point;
}

/** Point du trajet où la moitié du temps (ou de la distance) est écoulée. */
function midpointOf(detailed: Route, mode: CalcMode): Coord {
  const target = cost(detailed, mode) / 2;

  let accumulated = 0;
  for (const step of detailed.steps) {
    const stepCost = mode === "time" ? step.duration : step.distance;
    if (accumulated + stepCost < target || step.coordinates.length === 0) {
      accumulated += stepCost;
      continue;
    }

    // Fraction déjà parcourue à l'intérieur du tronçon qui franchit la moitié.
    const ratio = stepCost > 0 ? (target - accumulated) / stepCost : 0;
    const lastIndex = step.coordinates.length - 1;
    const index = Math.min(
      lastIndex,
      Math.max(0, Math.round(ratio * lastIndex)),
    );
    // biome-ignore lint/style/noNonNullAssertion: index borné ci-dessus
    return step.coordinates[index]!;
  }

  // Aucun tronçon n'a franchi la moitié : on retombe sur le dernier point connu.
  const last = detailed.steps.at(-1)?.coordinates.at(-1);
  if (!last) throw new Error("Itinéraire sans géométrie exploitable");
  return last;
}
