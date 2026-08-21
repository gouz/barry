import { route } from "../api/route.ts";
import type { Address } from "../state.ts";
import type { CalcMode, Coord, Route, Transport } from "../types.ts";
import {
  formatDistance,
  formatDuration,
  haversine,
  pairs,
} from "./geometry.ts";

type Located = Address & { coord: Coord };

export interface LongMiddleOptions {
  mode: CalcMode;
  transport: Transport;
  avoidMotorways: boolean;
  log: (message: string, detailed?: boolean) => void;
}

/** Nombre de paires soumises à l'IGN, au minimum. */
const CANDIDATES = 3;
/**
 * Écart toléré à la plus longue distance à vol d'oiseau pour rester candidat.
 *
 * Couvre le cas d'une paire un peu moins éloignée mais plus lente sur la route
 * (relief, absence d'autoroute), qui peut coiffer la première au poteau.
 */
const MARGIN = 0.15;

const cost = (r: Route, mode: CalcMode) =>
  mode === "time" ? r.duration : r.distance;

/**
 * Restreint les paires à celles susceptibles de porter le plus long trajet.
 *
 * Le classement à vol d'oiseau est gratuit et très corrélé au trajet routier :
 * plutôt que d'interroger l'IGN sur les n·(n−1)/2 paires, on ne garde que les
 * plus étirées. Le nombre d'appels devient constant au lieu de quadratique.
 */
function narrow(all: readonly [Located, Located][]): [Located, Located][] {
  if (all.length <= CANDIDATES) return [...all];

  const ranked = all
    .map((pair) => ({ pair, span: haversine(pair[0].coord, pair[1].coord) }))
    .sort((a, b) => b.span - a.span);

  // biome-ignore lint/style/noNonNullAssertion: `ranked` a la taille de `all`
  const threshold = ranked[0]!.span * (1 - MARGIN);
  return ranked
    .filter((entry, index) => index < CANDIDATES || entry.span >= threshold)
    .map((entry) => entry.pair);
}

/**
 * Point situé à mi-parcours du plus long trajet entre deux des villes.
 *
 * Coût : une requête par paire retenue par {@link narrow} — trois le plus
 * souvent, quel que soit le nombre de villes. Le détail des tronçons est
 * demandé dès cette passe : sur si peu de paires, la réponse plus lourde coûte
 * moins cher qu'une requête supplémentaire sur la paire gagnante.
 */
export async function longMiddle(
  addresses: readonly Located[],
  { mode, transport, avoidMotorways, log }: LongMiddleOptions,
): Promise<Coord> {
  const all = pairs(addresses);
  const combinations = narrow(all);

  // Annoncé sans repli dans le journal détaillé : le résultat repose sur un
  // échantillon de paires, l'utilisateur doit le savoir sans avoir à déplier.
  if (combinations.length < all.length) {
    log(
      `Je ne calcule pas les ${all.length} trajets possibles : le plus long relie forcément deux des villes les plus éloignées, je n'étudie donc que les ${combinations.length} paires les plus étirées à vol d'oiseau.`,
    );
  } else {
    log("Je calcule les chemins entre toutes les villes.", true);
  }

  const routes = await Promise.all(
    combinations.map(([a, b]) =>
      route(a.coord, b.coord, {
        mode,
        transport,
        avoidMotorways,
        withSteps: true,
      }),
    ),
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
  // biome-ignore lint/style/noNonNullAssertion: `best` est un index valide
  const point = midpointOf(routes[best]!, mode);
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
