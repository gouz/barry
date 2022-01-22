export function average() {
  return new Promise((resolve) => {
    const keys = Object.keys(window.$barry.places);
    let lons = 0;
    let lats = 0;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith("place")) {
        lons += parseFloat(window.$barry.places[keys[i]][0]);
        lats += parseFloat(window.$barry.places[keys[i]][1]);
      }
    }
    lons /= keys.length;
    lats /= keys.length;
    window.$barry.log("Je fais la moyenne des coordonnées des villes.", 1);
    resolve([lons, lats]);
  });
}
