import { calcPath } from "../MapsUtils";

export const longMiddle = () => {
  return new Promise((resolve, reject) => {
    window.$barry.log("Je calcule tous les chemins !");
    let prms = [];
    const keys = Object.keys(window.$barry.places);
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++)
        if (keys[i].startsWith("place") && keys[j].startsWith("place"))
          prms.push(
            calcPath(
              window.$barry.places[keys[i]],
              window.$barry.places[keys[j]],
              keys[i] + ";" + keys[j]
            )
          );
    Promise.all(prms).then((values) => {
      let maxDist = 0;
      let maxTime = 0;
      let keep = values[0].key;
      for (let i = 0; i < values.length; i++) {
        const t = parseFloat(values[i].path.duration);
        const d = parseFloat(values[i].path.distance);
        const hours = Math.floor(t / 3600);
        const mins = Math.floor((t / 60) % 60);
        let cities = values[i].key.split(";");
        window.$barry.log(
          `Entre "${
            document.querySelector(`input[data-city="${cities[0]}"]`).value
          }" et "${
            document.querySelector(`input[data-city="${cities[1]}"]`).value
          }" il y a ${Math.round((100 * d) / 1000) / 100} km en ${hours}h${
            mins < 10 ? "0" + mins : mins
          }`
        );
        if (
          (window.$barry.calculateMode == "time" && t > maxTime) ||
          (window.$barry.calculateMode == "distance" && d > maxDist)
        ) {
          maxDist = d;
          maxTime = t;
          keep = values[i].key;
        }
      }
      let points = keep.split(";");
      window.$barry.log(
        `Le trajet le plus long est donc entre "${
          document.querySelector(`input[data-city="${points[0]}"]`).value
        }" et "${
          document.querySelector(`input[data-city="${points[1]}"]`).value
        }"`
      );
      window.$barry.log("Je calcule le point à mi-temps.");
      if (points.length > 1) {
        calcPath(
          window.$barry.places[points[0]],
          window.$barry.places[points[1]],
          "",
          false,
          true
        ).then((res) => {
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
              ("time" == window.$barry.calculateMode && time > midTime) ||
              ("distance" == window.$barry.calculateMode && km > midDist)
            )
              break;
          }
          if (null != currentInstructions) {
            let delta = 0;
            if ("time" == window.$barry.calculateMode) {
              delta =
                (time - midTime) / parseFloat(currentInstructions.duration);
            } else if ("distance" == window.$barry.calculateMode) {
              delta = (km - midDist) / parseFloat(currentInstructions.distance);
            }
            window.$barry.log("Le point est trouvé.");
            resolve(
              currentInstructions.geometry.coordinates[
                Math.round(
                  (1 - delta) * currentInstructions.geometry.coordinates.length
                )
              ]
            );
          }
        });
      } else {
        reject("Pas de point trouvé");
      }
    });
  });
};
