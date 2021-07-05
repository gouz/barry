import "../css/globals.css";
import "../less/app.less";

import "ol/ol.css";

import { mapInit, drawMiddle } from "./MapsUtils";
import { windowInit } from "./WindowUtils";
import { calcMiddle as first } from "./FirstMethod";
import { calcMiddle as second } from "./SecondMethod";

mapInit();
windowInit();

window.calcMode = "time";

window.can_calc = false;
window.places = {};

document.querySelector("#calc").addEventListener(
  "click",
  () => {
    if (window.can_calc) {
      first().then((middle) => {
        drawMiddle(middle, "green", "first");
      });
      second().then((middle) => {
        drawMiddle(middle, "blue", "second");
      });
    }
  },
  true
);
