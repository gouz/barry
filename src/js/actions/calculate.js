import { fitToBox } from "../map/fitToBox";
import { drawMiddle } from "../map/drawMiddle";
import { detectNearCity } from "../map/detectNearCity";
import { addPoint } from "../map/addPoint";
import { longMiddle } from "../methods/longMiddle";
import { average } from "../methods/average";
import { center } from "../methods/center";

window.$barry.calculate = () => {
  window.$barry.$logContent.innerHTML = "";
  window.$barry.$log.classList.remove("hide");
  window.$barry.$spinner.classList.remove("hide");
  window.$barry.$rappel.classList.add("hide");
  const slug = [];
  slug.push(window.$barry.calculateMode);
  document.querySelectorAll(".address").forEach((a, _) => {
    const val = a.querySelector("input").value;
    if ("" == val) {
      window.$barry.removeAddress(a.id);
    } else {
      slug.push(val);
      a.querySelectorAll("button").forEach((e, _) => e.classList.add("hide"));
    }
  });
  window.location.hash = btoa(slug.join("|"));
  window.$barry.log(
    "C'est parti pour rechercher votre point de rencontre équitable"
  );

  const methods = [longMiddle(), average(), center()];
  const verbalMethods = ["longMiddle", "average", "center"];
  const weightMethods = [13, 2, 1];
  Promise.all(methods).then((values) => {
    window.$barry.log(
      "J'ai fini les différents calculs, je prend maintenant la moyenne des coordonnées.",
      1
    );
    let lon = 0;
    let lat = 0;
    let count = 0;
    if (Object.keys(window.$barry.places).length > 2) {
      values.map((v, i) => {
        for (let j = 0; j < weightMethods[i]; j++) {
          lon += Number.parseFloat(v[0]);
          lat += Number.parseFloat(v[1]);
          count++;
        }
        addPoint(
          v[0],
          v[1],
          window.$barry.methods[verbalMethods[i]].color,
          verbalMethods[i]
        );
      });
      lon /= count;
      lat /= count;
    } else if (values) {
      lon = values[0][0];
      lat = values[0][1];
      addPoint(
        lon,
        lat,
        window.$barry.methods[verbalMethods[0]].color,
        verbalMethods[0]
      );
    }
    window.$barry.log(`On se retrouve à [${lon}, ${lat}]`, 1);
    window.$barry.log("Je cherche la ville la plus proche du point.", 1);
    addPoint(lon, lat, window.$barry.resultColor, "result");
    detectNearCity([lon, lat]).then((coord) => {
      if (coord[0] === coord[1] && coord[0] === 0) {
        window.$barry.log(
          "Pas de ville trouvée proche, je suis désolé mais va falloir le faire à la main."
        );
      } else {
        drawMiddle(coord, window.$barry.resultColor, "result");
        fitToBox();
        window.$barry.meetPoint = coord;
        window.$barry.$pois.classList.remove("hide");
      }
      window.$barry.$spinner.classList.add("hide");
      window.$barry.$calculate.classList.add("hide");
      window.$barry.$newsearch.classList.remove("hide");
    });
  });
};
