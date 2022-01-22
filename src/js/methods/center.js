export const center = () => {
  return new Promise((resolve) => {
    const keys = Object.keys(window.$barry.places);
    let minLon = 99;
    let maxLon = -99;
    let minLat = 99;
    let maxLat = -99;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith("place")) {
        const lo = parseFloat(window.$barry.places[keys[i]][0]);
        const la = parseFloat(window.$barry.places[keys[i]][1]);
        if (minLon > lo) minLon = lo;
        if (maxLon < lo) maxLon = lo;
        if (minLat > la) minLat = la;
        if (maxLat < la) maxLat = la;
      }
    }
    window.$barry.log(
      "Je détermine les latitudes et longitudes minimales et maximales pour définir un cadre et je calcule le centre du cadre."
    );
    resolve([(maxLon + minLon) / 2, (maxLat + minLat) / 2]);
  });
};
