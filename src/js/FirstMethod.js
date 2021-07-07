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
              keys[i] + ";" + keys[j],
              true
            )
          );
    Promise.all(prms).then((values) => {
      let maxDist = 0;
      let maxTime = 0;
      let keep = "";
      for (let i = 0; i < values.length; i++) {
        const t = parseFloat(values[i].path.durationSeconds);
        const d = parseFloat(values[i].path.distanceMeters);
        //let date = new Date();
        //date.setSeconds(d);
        let cities = values[i].key.split(";");
        window.log(
          `Entre "${
            document.querySelector(`input[data-city="${cities[0]}"]`).value
          }" et "${
            document.querySelector(`input[data-city="${cities[1]}"]`).value
          }" il y a ${Math.round((100 * d) / 1000) / 100} km` //  en ${date.toISOString().substr(11, 8)}
        );
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
        calcPath(places[points[0]], places[points[1]], "", false).then(
          (res) => {
            const route = res.path.routeGeometry.coordinates;
            // for (let i = 0; i < route.length; i += 100)
            //   addPoint(route[i][0], route[i][1], "yellow");
            getIsoCurve(
              window.places[points[0]],
              Math.round(maxDist / 2),
              Math.round(maxTime / 2),
              calcMode
            ).then((result) => {
              search: for (
                let i = 0;
                i < result.geometry.coordinates[0].length;
                i++
              )
                for (let j = 0; j < route.length; j++)
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
              reject();
            });
          }
        );
    });
  });
}
