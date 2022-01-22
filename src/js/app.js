import "../less/app.less";
import "ol/ol.css";

import "./globals";
import "./actions/calculate";
import "./actions/canCalculate";
import "./actions/log";
import "./actions/newAddress";
import "./actions/newSearch";
import "./actions/placePoint";
import "./actions/removeAddress";
import "./actions/toggleWelcome";

import { mapInit } from "./MapsUtils";

mapInit();

window.$barry.newAddress();
