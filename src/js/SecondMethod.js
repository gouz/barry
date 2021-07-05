import { addPoint } from "./MapsUtils";

export function calcMiddle() {
  return new Promise((resolve) => {
    const keys = Object.keys(window.places);
    let lons = 0;
    let lats = 0;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith("place")) {
        lons += parseFloat(window.places[keys[i]][0]);
        lats += parseFloat(window.places[keys[i]][1]);
      }
    }
    lons /= keys.length;
    lats /= keys.length;
    resolve([lons, lats]);
  });
}
