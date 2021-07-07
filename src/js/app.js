import "../css/globals.css";
import "../less/app.less";

import "ol/ol.css";

import { mapInit, drawMiddle } from "./MapsUtils";
import { windowInit } from "./WindowUtils";
import { calcMiddle as first } from "./FirstMethod";
import { calcMiddle as second } from "./SecondMethod";
import { calcMiddle as third } from "./ThirdMethod";

mapInit();
windowInit();

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
      Promise.all([first(), second(), third()]).then((values) => {
        window.log(
          "J'ai fini les différents calculs, je prend maintenant la moyenne des coordonnées."
        );
        let lon = 0;
        let lat = 0;
        const keys = ["first", "second", "third"];
        const colors = ["green", "blue", "orange"];
        values.map((v, i) => {
          lon += v[0];
          lat += v[1];
          drawMiddle(v, colors[i], keys[i], false);
        });
        lon /= values.length;
        lat /= values.length;
        drawMiddle([lon, lat], "red", "result", true);
        setTimeout(() => {
          window.log("Trouvé, je ferme cette boîte dans 2 secondes");
          document.querySelector("#wip").style.display = "none";
        }, 2000);
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

document.querySelector("#wip").style.display = "none";
