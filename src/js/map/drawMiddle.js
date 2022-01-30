import { calcPath } from "./calcPath";
import { addPoint } from "./addPoint";
import { addRoad } from "./addRoad";

export const drawMiddle = (middle, color, dest) => {
  const keys = Object.keys(window.$barry.places);
  let prms = [];
  for (let k = 0; k < keys.length; k++)
    if (keys[k].startsWith("place"))
      prms.push(
        new Promise((resolve) => {
          calcPath(window.$barry.places[keys[k]], middle, k).then((res) => {
            const seconds = res.totalTime;
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds / 60) % 60);
            addRoad(
              res.routeGeometry,
              window.$barry.roadColor,
              `route_${res.key}`
            );
            window.$barry.log(
              `
<span onmouseenter="window.$barry.showNav('route_${res.key}', 1);"
      onmouseleave="window.$barry.showNav('route_${res.key}', 0)"
      onclick="window.$barry.zoom([[${res.bbox.top}, ${res.bbox.left}],[${
                res.bbox.bottom
              }, ${res.bbox.right}]])"
>
  De 
  <b>
    ${document.querySelector(`input[data-city="${keys[k]}"]`).value}
  </b>
  , il y 
  <b>
    ${Math.round((100 * parseFloat(res.totalDistance)) / 1000) / 100}
  </b>
  km en
  <b>
    ${hours} h ${mins < 10 ? "0" + mins : mins}
  </b>
</span>`
            );
            resolve();
          });
        })
      );
  window.$barry.log("Je calcule le trajet pour chaque ville.", 1);
  Promise.all(prms).then(() => {
    addPoint(middle[0], middle[1], color, dest);
  });
};
