import "../css/globals.css";
import "../less/app.less";

import "ol/ol.css";

import { mapInit, drawMiddle, detectNearCity } from "./MapsUtils";
import { windowInit } from "./WindowUtils";
import { calcMiddle as first } from "./FirstMethod";
import { calcMiddle as second } from "./SecondMethod";
import { calcMiddle as third } from "./ThirdMethod";

mapInit();
windowInit();

const keys = ["first", "second", "third"];
const colors = ["green", "blue", "orange"];

window.calcMode = "time";

window.can_calc = false;
window.places = {};

document.querySelector("#calc").addEventListener(
  "click",
  () => {
    if (window.can_calc) {
      document.querySelector("#calc").style.display = "none";
      document.querySelector("#wip").style.display = "flex";
      window.log("C'est parti pour rechercher votre centre équitable");
      let methods = [first()];
      if (document.querySelectorAll("input[data-place]").length > 2) {
        methods.push(second());
        methods.push(third());
      }
      Promise.all(methods).then((values) => {
        window.log(
          "J'ai fini les différents calculs, je prend maintenant la moyenne des coordonnées."
        );
        let lon = 0;
        let lat = 0;
        values.map((v, i) => {
          lon += parseFloat(v[0]);
          lat += parseFloat(v[1]);
          drawMiddle(v, colors[i], keys[i], false);
        });
        lon /= values.length;
        lat /= values.length;
        window.log(`On se retrouve à [${lon}, ${lat}]`);
        window.log("Je trouve la ville la plus proche du point.");
        drawMiddle([lon, lat], "red", "result", false);
        detectNearCity([lon, lat]).then((coord) => {
          if (coord[0] == coord[1] && coord[0] == 0) {
            window.log(
              "Pas de ville trouvée proche, je suis désolé mais va falloir le faire à la main."
            );
            document.querySelector(".spinner").style.display = "none";
            window.log(
              `<a href="#" onclick="window.hideWIP(); return false;">Fermer</a>`
            );
          } else drawMiddle(coord, "red", "result", true);
        });
      });
    }
  },
  true
);

document.querySelector("#help-close").addEventListener(
  "click",
  () => {
    document.querySelector("#help").style.display = "none";
  },
  true
);
