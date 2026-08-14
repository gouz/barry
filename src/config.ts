import type { MethodId, MethodMeta } from "./types.ts";

export const METHODS: Readonly<Record<MethodId, MethodMeta>> = {
  longMiddle: {
    label:
      "Le mi-chemin en temps sur le plus long trajet entre toutes les villes",
    color: "#10b981",
    weight: 13,
  },
  average: {
    label: "La moyenne des coordonnées des villes",
    color: "#3b82f6",
    weight: 2,
  },
  center: {
    label: "Le centre du cadre dans lequel toutes les villes sont présentes",
    color: "#f59e0b",
    weight: 1,
  },
};

export const METHOD_IDS = Object.keys(METHODS) as MethodId[];

export const COLORS = {
  address: "#111827",
  result: "#EF4444",
  road: "#47695B",
} as const;

/** Cadre couvrant la France métropolitaine, en `[[lat, lon], [lat, lon]]`. */
export const FRANCE_BOX = [
  [51.31133241804094, -4.369239747680932],
  [42.14745185055437, 8.623599144082085],
] as const;
