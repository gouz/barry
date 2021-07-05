import { calcPath, getIsoCurve, roundCoord, addPoint } from "./MapsUtils";

export function calcMiddle() {
  return new Promise((resolve, reject) => {
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
      let route = [];
      for (let i = 0; i < values.length; i++) {
        const t = parseFloat(values[i].path.durationSeconds);
        const d = parseFloat(values[i].path.distanceMeters);
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
      console.log("find : ", points);
      if (points.length > 1)
        calcPath(places[points[0]], places[points[1]], "", false).then(
          (res) => {
            route = res.path.routeGeometry.coordinates;
            // for (let i = 0; i < route.length; i += 100)
            //   addPoint(route[i][0], route[i][1], "yellow");
            getIsoCurve(
              window.places[points[0]],
              Math.round(maxDist / 2),
              Math.round(maxTime / 2),
              calcMode
            ).then((result) => {
              for (let i = 0; i < result.geometry.coordinates[0].length; i++)
                for (let j = 0; j < route.length; j++)
                  if (
                    roundCoord(result.geometry.coordinates[0][i][0]) ==
                      roundCoord(route[j][0]) &&
                    roundCoord(result.geometry.coordinates[0][i][1]) ==
                      roundCoord(route[j][1])
                  ) {
                    resolve(result.geometry.coordinates[0][i]);
                  }
              reject();
            });
          }
        );
    });
  });
}
