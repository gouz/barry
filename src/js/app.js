import "../css/globals.css";
import "../less/app.less";

import "ol/ol.css";

import { mapInit, addPoint, calcPath } from "./MapsUtils";
import { windowInit } from "./WindowUtils";
import { calcMiddle as first } from "./FirstMethod";
import { calcMiddle as second } from "./SecondMethod";

mapInit();
windowInit();

window.calcMode = "distance";

window.can_calc = false;
window.places = {};

document.querySelector("#calc").addEventListener(
  "click",
  () => {
    if (window.can_calc) {
      first().then((middle) => {
        addPoint(middle[0], middle[1], "green", "first");
        const keys = Object.keys(window.places);
        for (let k = 0; k < keys.length; k++)
          calcPath(window.places[keys[k]], middle, k, true).then((res) => {
            let e = document.querySelector("#res_" + res.key + " .first");
            if (e) {
              e.innerText = res.path.duration + " / " + res.path.distance;
            }
          });
      });
      second().then((middle) => {
        addPoint(middle[0], middle[1], "blue", "second");
        const keys = Object.keys(window.places);
        for (let k = 0; k < keys.length; k++)
          calcPath(window.places[keys[k]], middle, k, true).then((res) => {
            let e = document.querySelector("#res_" + res.key + " .second");
            if (e) {
              e.innerText = res.path.duration + " / " + res.path.distance;
            }
          });
      });
    }
  },
  true
);
