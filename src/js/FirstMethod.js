import { calcPath, getIsoCurve, roundCoord, addPoint } from "./MapsUtils";

export function calcMiddle() {
  return new Promise((resolve, reject) => {
    window.log("Je calcule tous les chemins !");
    let prms = [];
    const keys = Object.keys(window.places);
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++)
        if (keys[i].startsWith("place") && keys[j].startsWith("place"))
          prms.push(
            calcPath(
              window.places[keys[i]],
              window.places[keys[j]],
              keys[i] + ";" + keys[j]
            )
          );
    Promise.all(prms).then((values) => {
      let maxDist = 0;
      let maxTime = 0;
      let keep = "";
      for (let i = 0; i < values.length; i++) {
        const t = parseFloat(values[i].path.durationSeconds);
        const d = parseFloat(values[i].path.distanceMeters);
        const hours = Math.floor(t / 3600);
        const mins = Math.floor((t / 60) % 60);
        let cities = values[i].key.split(";");
        window.log(
          `Entre "${
            document.querySelector(`input[data-city="${cities[0]}"]`).value
          }" et "${
            document.querySelector(`input[data-city="${cities[1]}"]`).value
          }" il y a ${Math.round((100 * d) / 1000) / 100} km en ${hours}h${
            mins < 10 ? "0" + mins : mins
          }`
        );
        x;
        if (
          (calcMode == "time" && t > maxTime) ||
          (calcMode == "distance" && d > maxDist)
        ) {
          maxDist = d;
          maxTime = t;
          keep = values[i].key;
        }
      }
      let points = keep.split(";");
      window.log(
        `Le trajet le plus long est donc entre "${
          document.querySelector(`input[data-city="${points[0]}"]`).value
        }" et "${
          document.querySelector(`input[data-city="${points[1]}"]`).value
        }"`
      );
      window.log("Je calcule le point à mi-temps.");
      if (points.length > 1)
        calcPath(places[points[0]], places[points[1]], "", false, true).then(
          (res) => {
            let currentInstructions = null;
            const nbInstructions = res.path.routeInstructions.length;
            let time = 0;
            let km = 0;
            const midTime = Math.round(maxTime / 2);
            const midDist = Math.round(maxDist / 2);
            for (let i = 0; i < nbInstructions; i++) {
              km += parseFloat(res.path.routeInstructions[i].distance);
              time += parseFloat(res.path.routeInstructions[i].duration);
              currentInstructions = res.path.routeInstructions[i];
              if (
                ("time" == window.calcMode && time > midTime) ||
                ("distance" == window.calcMode && km > midDist)
              )
                break;
            }
            if (null != currentInstructions) {
              let delta = 0;
              if ("time" == window.calcMode) {
                delta =
                  (time - midTime) / parseFloat(currentInstructions.duration);
              } else if ("distance" == window.calcMode) {
                delta =
                  (km - midDist) / parseFloat(currentInstructions.distance);
              }
              window.log("Le point est trouvé.");
              resolve(
                currentInstructions.geometry.coordinates[
                  Math.round(
                    delta * currentInstructions.geometry.coordinates.length
                  )
                ]
              );
            }
            /*
            const route = res.path.routeGeometry.coordinates;
            getIsoCurve(
              window.places[points[0]],
              midDist,
              midTime,
              calcMode
            ).then((result) => {
              search: for (
                let i = 0;
                i < result.geometry.coordinates[0].length;
                i += 20
              ) {
                for (let j = 0; j < route.length; j += 20)
                  if (
                    roundCoord(result.geometry.coordinates[0][i][0]) ==
                      roundCoord(route[j][0]) &&
                    roundCoord(result.geometry.coordinates[0][i][1]) ==
                      roundCoord(route[j][1])
                  ) {
                    window.log("Le point est trouvé.");
                    resolve(result.geometry.coordinates[0][i]);
                    break search;
                  }
              }
              reject();
            });
            */
          }
        );
    });
  });
}
