import type { Texts } from "./texts.ts";

export const EN: Texts = {
  distance: (meters) =>
    `${(Math.round((100 * meters) / 1000) / 100).toLocaleString("en")} km`,
  duration: (seconds) =>
    `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds / 60) % 60)).padStart(2, "0")}m`,

  narrowing: (total, kept) =>
    `I am not computing all ${total} possible trips: the longest one necessarily links two of the farthest cities, so I only study the ${kept} pairs that are most stretched as the crow flies.`,
  allPairs: "I am computing the trips between every city.",
  pair: (from, to, distance, duration) =>
    `Between “${from}” and “${to}” there are ${distance} in ${duration}`,
  longest: (from, to, mode) =>
    `The longest trip (by ${mode === "time" ? "time" : "distance"}) is therefore between “${from}” and “${to}”`,
  middleComputing: "I am computing the halfway point.",
  middleFound: "The point is found.",

  averaging: "I am averaging the coordinates of the cities.",
  framing:
    "I am taking the smallest and largest latitudes and longitudes to draw a frame, and computing the centre of that frame.",
  weighting:
    "The individual calculations are done, I am now averaging the coordinates.",

  notFound: "Address not found",
};
