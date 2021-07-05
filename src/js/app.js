import "../css/globals.css";
import "../less/app.less";

import "ol/ol.css";

import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { Circle, Fill, Style } from "ol/style";
import { Point } from "ol/geom";
import { useGeographic } from "ol/proj";
import { Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { Feature, Map, View } from "ol/index";
import * as Gp from "geoportal-access-lib/dist/GpServices";
import { Nominatim } from "nominatim-geocoder";

const calcMode = "distance";

const geocoder = new Nominatim();
useGeographic();

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: [2.213749, 46.227638],
    zoom: 6,
  }),
});

let layers = [];
let places = [];

let can_calc = false;

const addPoint = (lon, lat, color) => {
  let place = [lon, lat];
  places.push(place);
  let point = new Point(place);
  const layer = new VectorLayer({
    source: new VectorSource({
      features: [new Feature(point)],
    }),
    style: new Style({
      image: new Circle({
        radius: 3,
        fill: new Fill({ color: color }),
      }),
    }),
  });
  layers.push(layer);
  map.addLayer(layer);
};

const calcPath = (start, end, key, full) => {
  return new Promise((resolve) => {
    Gp.Services.route({
      apiKey: "jhyvi0fgmnuxvfv0zjzorvdn", // api key found on npmjs
      startPoint: { x: start[0], y: start[1] },
      endPoint: { x: end[0], y: end[1] },
      graph: "Voiture",
      distanceUnit: "m",
      routePreference: calcMode == "time" ? "fastest" : "shortest",
      geometryInInstructions: false,
      rawResponse: full,
      onSuccess: function (result) {
        resolve({ key: key, path: result });
      },
    });
  });
};

const getPlace = (address) => {
  if (address.trim() != "") {
    can_calc = false;
    document.querySelector("#calc").classList.add("disabled");
    return new Promise((resolve) => {
      geocoder
        .search({ q: address })
        .then((response) => {
          addPoint(response[0].lon, response[0].lat, "red");
          if (places.length > 0) {
            can_calc = true;
            document.querySelector("#calc").classList.remove("disabled");
          }
          resolve();
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }
};

const roundCoord = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

document.querySelector("#calc").addEventListener(
  "click",
  () => {
    if (places.length > 1 && can_calc) {
      let prms = [];
      for (let i = 0; i < places.length; i++)
        for (let j = i + 1; j < places.length; j++)
          prms.push(calcPath(places[i], places[j], i + "_" + j, true));
      Promise.all(prms).then((values) => {
        let maxDist = 0;
        let maxTime = 0;
        let keep = "";
        let route = [];
        for (let i = 0; i < values.length; i++) {
          if (
            (calcMode == "time" && values[i].path.durationSeconds > maxTime) ||
            (calcMode == "distance" && values[i].path.distanceMeters > maxDist)
          ) {
            maxDist = values[i].path.distanceMeters;
            maxTime = values[i].path.durationSeconds;
            keep = values[i].key;
          }
        }
        let points = keep.split("_");
        console.log("find : ", points);
        if (points.length > 1)
          calcPath(places[points[0]], places[points[1]], "", false).then(
            (res) => {
              route = res.path.routeGeometry.coordinates;
              // for (let i = 0; i < route.length; i += 100)
              //   addPoint(route[i][0], route[i][1], "yellow");
              Gp.Services.isoCurve({
                apiKey: "jhyvi0fgmnuxvfv0zjzorvdn",
                position: { x: places[points[0]][0], y: places[points[0]][1] },
                method: calcMode,
                distance: Math.ceil(maxDist / 2),
                time: Math.ceil(maxTime / 2),
                graph: "Voiture",
                onSuccess: function (result) {
                  let found = false;
                  search: for (
                    let i = 0;
                    i < result.geometry.coordinates[0].length;
                    i++
                  )
                    for (let j = 0; j < route.length; j++)
                      if (
                        roundCoord(result.geometry.coordinates[0][i][0]) ==
                          roundCoord(route[j][0]) &&
                        roundCoord(result.geometry.coordinates[0][i][1]) ==
                          roundCoord(route[j][1])
                      ) {
                        found = true;
                        console.log(
                          "found ",
                          result.geometry.coordinates[0][i][0]
                        );
                        addPoint(
                          result.geometry.coordinates[0][i][0],
                          result.geometry.coordinates[0][i][1],
                          "green"
                        );
                        for (let k = 0; k < places.length; k++)
                          calcPath(
                            places[k],
                            result.geometry.coordinates[0][i],
                            k,
                            true
                          ).then((res) => {
                            document.querySelector(
                              "#res_" + res.key
                            ).innerText =
                              res.path.duration + " / " + res.path.distance;
                          });
                        break search;
                      }
                  if (!found) console.log("not found");
                },
              });
            }
          );
      });
    }
  },
  true
);

let address_count = 0;
window.newAddress = () => {
  const div = document.createElement("div");
  div.classList.add("flex");
  div.innerHTML = `
        <input id="address_${address_count}"type="text" placeholder="Adresse postale" onblur="window.placePoint(this.value);" />
        <button class="minus" onclick="window.removeAddress(this)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> 
            </svg>
        </button>
        <button onclick="window.newAddress()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12H12M18 12H12M12 12V6M12 12V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </button>
        <div id="res_${address_count}"></div>
    `;
  document.querySelector("#address #wrapper").appendChild(div);
  address_count++;
};
newAddress();

window.removeAddress = (element) => {
  element.parentNode.parentNode.removeChild(element.parentNode);
};

window.placePoint = (address) => {
  getPlace(address);
};

window.clear = () => {
  layers.map((l) => {
    map.removeLayer(l);
  });
  layers = [];
  places = [];
};
