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
            getIsoCurve(
              window.places[points[0]],
              Math.round(maxDist / 2),
              Math.round(maxTime / 2),
              calcMode
            ).then((result) => {
              search: for (
                let i = 0;
                i < result.geometry.coordinates[0].length;
                i += 50
              ) {
                for (let j = 0; j < route.length; j += 10)
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
          }
        );
    });
  });
}
