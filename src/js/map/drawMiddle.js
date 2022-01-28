import { calcPath } from "./calcPath";
import { addPoint } from "./addPoint";

export const drawMiddle = (middle, color, dest) => {
  const keys = Object.keys(window.$barry.places);
  let prms = [];
  for (let k = 0; k < keys.length; k++)
    if (keys[k].startsWith("place"))
      prms.push(
        new Promise((resolve) => {
          calcPath(window.$barry.places[keys[k]], middle, k, true).then(
            (res) => {
              const seconds = res.duration * 60;
              const hours = Math.floor(seconds / 3600);
              const mins = Math.floor((seconds / 60) % 60);
              const route = res.geometry.coordinates;
              const step = 7 * Object.keys(window.$barry.places).length;
              let minLon = 99;
              let maxLon = -99;
              let minLat = 99;
              let maxLat = -99;
              for (let i = 0; i < route.length; i += step) {
                const lo = parseFloat(route[i][0]);
                const la = parseFloat(route[i][1]);
                if (minLon > lo) minLon = lo;
                if (maxLon < lo) maxLon = lo;
                if (minLat > la) minLat = la;
                if (maxLat < la) maxLat = la;
                addPoint(
                  route[i][0],
                  route[i][1],
                  window.$barry.roadColor,
                  `route_${res.key}_${i}`,
                  2
                );
              }
              window.$barry.log(
                `
<span onmouseenter="window.$barry.showNav('route_${res.key}', 1);"
      onmouseleave="window.$barry.showNav('route_${res.key}', 0)"
      onclick="window.$barry.zoom([[${minLat}, ${minLon}],[${maxLat}, ${maxLon}]])"
>
  De 
  <b>
    ${document.querySelector(`input[data-city="${keys[k]}"]`).value}
  </b>
  , il y 
  <b>
    ${Math.round((100 * parseFloat(res.distance)) / 1000) / 100}
  </b>
  km en
  <b>
    ${hours} h ${mins < 10 ? "0" + mins : mins}
  </b>
</span>`
              );
              resolve();
            }
          );
        })
      );
  window.$barry.log("Je calcule le trajet pour chaque ville.", 1);
  Promise.all(prms).then(() => {
    addPoint(middle[0], middle[1], color, dest);
  });
};
