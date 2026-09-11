import type { Texts } from "./texts.ts";

export const FR: Texts = {
  distance: (meters) =>
    `${(Math.round((100 * meters) / 1000) / 100).toLocaleString("fr-FR")} km`,
  duration: (seconds) =>
    `${Math.floor(seconds / 3600)}h${String(Math.floor((seconds / 60) % 60)).padStart(2, "0")}`,

  narrowing: (total, kept) =>
    `Je ne calcule pas les ${total} trajets possibles : le plus long relie forcément deux des villes les plus éloignées, je n'étudie donc que les ${kept} paires les plus étirées à vol d'oiseau.`,
  allPairs: "Je calcule les chemins entre toutes les villes.",
  pair: (from, to, distance, duration) =>
    `Entre « ${from} » et « ${to} » il y a ${distance} en ${duration}`,
  longest: (from, to, mode) =>
    `Le trajet le plus long (en ${mode === "time" ? "temps" : "distance"}) est donc entre « ${from} » et « ${to} »`,
  middleComputing: "Je calcule le point à mi-temps.",
  middleFound: "Le point est trouvé.",

  averaging: "Je fais la moyenne des coordonnées des villes.",
  framing:
    "Je détermine les latitudes et longitudes minimales et maximales pour définir un cadre et je calcule le centre du cadre.",
  weighting:
    "J'ai fini les différents calculs, je prend maintenant la moyenne des coordonnées.",

  notFound: "Adresse introuvable",
};
