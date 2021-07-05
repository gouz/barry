export const calcMiddle = () => {
  return new Promise((resolve) => {
    const keys = Object.keys(window.places);
    let minLon = 99;
    let maxLon = -99;
    let minLat = 99;
    let maxLat = -99;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith("place")) {
        const lo = parseFloat(window.places[keys[i]][0]);
        const la = parseFloat(window.places[keys[i]][1]);
        if (minLon > lo) minLon = lo;
        if (maxLon < lo) maxLon = lo;
        if (minLat > la) minLat = la;
        if (maxLat < la) maxLat = la;
      }
    }
    resolve([(maxLon + minLon) / 2, (maxLat + minLat) / 2]);
  });
};
