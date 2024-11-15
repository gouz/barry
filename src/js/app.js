import "../less/app.less";
import "ol/ol.css";

import "./globals";
import "./actions/calcAddress";
import "./actions/calcBox";
import "./actions/calculate";
import "./actions/canCalculate";
import "./actions/canPlace";
import "./actions/changeCalcMode";
import "./actions/changeCalcTransport";
import "./actions/changeCalcToll";
import "./actions/changeLogMode";
import "./actions/log";
import "./actions/managePOI";
import "./actions/newAddress";
import "./actions/newSearch";
import "./actions/placePoint";
import "./actions/removeAddress";
import "./actions/showPOI";
import "./actions/showNav";
import "./actions/toggleConfiguration";
import "./actions/toggleWelcome";
import "./actions/tourisme";
import "./actions/zoom";

import { mapInit } from "./map/init";
import { zoomToFrance } from "./map/zoomToFrance";
mapInit();
zoomToFrance();

window.$barry.newAddress();

if (window.location.hash !== "") {
  const s = atob(window.location.hash.substring(1)).split("|");
  if (s.length > 1) {
    window.$barry.calculateMode = s.shift();
    if ("time" !== window.$barry.calculateMode) {
      window.$barry.$toggleCalcMode.checked = true;
    }
    s.forEach((c, _) => {
      const place = window.$barry.addressesCount - 1;
      window.$barry.canPlace(`place_${place}`);
      window.$barry.placePoint(c, `place_${place}`);
      const addr = document.getElementById(`address_${place}`);
      addr.querySelector("input").value = c;
      addr.querySelector(".plus").classList.add("hide");
      addr.querySelector(".minus").classList.remove("hide");
      window.$barry.newAddress();
    });
  }
}
