import type { CalcMode } from "../types.ts";

/**
 * Les phrases des modules partagés.
 *
 * Le calcul, lui, est le même partout : il n'a pas à savoir dans quelle langue
 * il s'explique. Chaque page apporte son jeu de phrases — {@link FR} pour la
 * France, {@link EN} pour le monde — et les modules communs s'y réfèrent sans
 * jamais écrire un mot en dur.
 *
 * Les formats numériques en font partie : « 1 234,5 km » et « 1,234.5 km »
 * relèvent de la même décision que le reste du texte.
 */
export interface Texts {
  distance(meters: number): string;
  duration(seconds: number): string;

  /* Recherche du plus long trajet. */
  narrowing(total: number, kept: number): string;
  allPairs: string;
  pair(from: string, to: string, distance: string, duration: string): string;
  longest(from: string, to: string, mode: CalcMode): string;
  middleComputing: string;
  middleFound: string;

  /* Combinaison des trois méthodes. */
  averaging: string;
  framing: string;
  weighting: string;

  /* Saisie des adresses. */
  notFound: string;
}
