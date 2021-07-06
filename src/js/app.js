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
      Promise.all([first(), second(), third()]).then((values) => {
        let lon = 0;
        let lat = 0;
        const keys = ["first", "second", "third"];
        const colors = ["green", "blue", "orange"];
        values.map((v, i) => {
          lon += v[0];
          lat += v[1];
          //drawMiddle(v, colors[i], keys[i], false);
        });
        lon /= values.length;
        lat /= values.length;
        drawMiddle([lon, lat], "red", "result", true);
      });
    }
  },
  true
);
