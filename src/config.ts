import type { MethodId, MethodMeta } from "./types.ts";

export const METHODS: Readonly<Record<MethodId, MethodMeta>> = {
  longMiddle: {
    label:
      "Le mi-chemin en temps sur le plus long trajet entre toutes les villes",
    color: "#1f7a5c",
    weight: 13,
  },
  average: {
    label: "La moyenne des coordonnées des villes",
    color: "#1d4f91",
    weight: 2,
  },
  center: {
    label: "Le centre du cadre dans lequel toutes les villes sont présentes",
    color: "#b3701a",
    weight: 1,
  },
};

export const METHOD_IDS = Object.keys(METHODS) as MethodId[];

/**
 * Palette de la carte.
 *
 * Ces valeurs doublent les jetons `--color-m-*` de `css/_tokens.css` : les
 * repères de la carte et les pastilles de légende doivent rester identiques.
 */
export const COLORS = {
  address: "#17140f",
  result: "#cf3a22",
  /** Les trajets restent à l'encre : ils ne rivalisent pas avec les repères. */
  road: "#574f44",
  roadHint: "#a9a091",
  highlight: "#cf3a22",
  /** Liseré papier autour des repères, pour les détacher du fond de carte. */
  halo: "#fbf9f5",
} as const;

/** Cadre couvrant la France métropolitaine, en `[[lat, lon], [lat, lon]]`. */
export const FRANCE_BOX = [
  [51.31133241804094, -4.369239747680932],
  [42.14745185055437, 8.623599144082085],
] as const;
