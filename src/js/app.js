import "../css/globals.css";
import "../less/app.less";

import "ol/ol.css";

import { mapInit, drawMiddle, detectNearCity, addPoint } from "./MapsUtils";
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
      document
        .querySelectorAll("#addresses button")
        .forEach((e) => (e.style.display = "none"));
      window.log("C'est parti pour rechercher votre centre équitable");
      let methods = [first(), second(), third()];
      Promise.all(methods).then((values) => {
        window.log(
          "J'ai fini les différents calculs, je prend maintenant la moyenne des coordonnées."
        );
        let lon = 0;
        let lat = 0;
        if (window.nbPlaces > 2) {
          values.map((v, i) => {
            lon += parseFloat(v[0]);
            lat += parseFloat(v[1]);
            addPoint(v[0], v[1], colors[i], keys[i]);
          });
          lon /= values.length;
          lat /= values.length;
        } else {
          lon = values[0][0];
          lat = values[0][1];
          addPoint(lon, lat, colors[0], keys[0]);
        }
        window.log(`On se retrouve à [${lon}, ${lat}]`);
        window.log("Je trouve la ville la plus proche du point.");
        addPoint(lon, lat, "red", "result");
        detectNearCity([lon, lat]).then((coord) => {
          if (coord[0] == coord[1] && coord[0] == 0) {
            window.log(
              "Pas de ville trouvée proche, je suis désolé mais va falloir le faire à la main."
            );
            document.querySelector(".spinner").style.display = "none";
            window.log(
              `<a href="#" onclick="window.hideWIP(); return false;">Fermer</a>`
            );
          } else drawMiddle(coord, "red", "result");
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
