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

let api_key = "jhyvi0fgmnuxvfv0zjzorvdn";
/*
if (window.location.hostname == "gouz.github.io")
  api_key = "34qcij6n2ecigthilez75ny1"; // only available for REFERER = gouz.github.io
*/

export function mapInit() {
  window.layers = {};
  window.geocoder = new Nominatim({ secure: true });
  useGeographic();
  window.map = new Map({
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
}

export const roundCoord = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const addPoint = (lon, lat, color, id) => {
  let place = [lon, lat];
  if (typeof window.layers[id] != undefined)
    window.map.removeLayer(window.layers[id]);
  if (id.startsWith("place")) window.places[id] = place;
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
  window.layers[id] = layer;
  window.map.addLayer(layer);
};

export const calcPath = (start, end, key, full) => {
  return new Promise((resolve) => {
    Gp.Services.route({
      apiKey: api_key,
      startPoint: { x: start[0], y: start[1] },
      endPoint: { x: end[0], y: end[1] },
      graph: "Voiture",
      distanceUnit: "m",
      routePreference: window.calcMode == "time" ? "fastest" : "shortest",
      geometryInInstructions: false,
      rawResponse: full,
      onSuccess: function (result) {
        resolve({ key: key, path: result });
      },
    });
  });
};

export const getPlace = (address, id) => {
  if (address.trim() != "") {
    window.can_calc = false;
    document.querySelector("#calc").classList.add("disabled");
    return new Promise((resolve) => {
      geocoder
        .search({ q: address })
        .then((response) => {
          addPoint(response[0].lon, response[0].lat, "black", id);
          if (Object.keys(window.places).length > 1) {
            window.can_calc = true;
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

export const getIsoCurve = (point, distance, time) => {
  return new Promise((resolve) => {
    Gp.Services.isoCurve({
      apiKey: api_key,
      position: { x: point[0], y: point[1] },
      method: window.calcMode,
      distance: distance,
      time: time,
      graph: "Voiture",
      onSuccess: function (result) {
        resolve(result);
      },
    });
  });
};

export const drawMiddle = (middle, color, dest, withCalc) => {
  addPoint(middle[0], middle[1], color, dest);
  if (withCalc) {
    const keys = Object.keys(window.places);
    for (let k = 0; k < keys.length; k++)
      if (keys[k].startsWith("place"))
        calcPath(window.places[keys[k]], middle, k, true).then((res) => {
          let e = document.querySelector("#res_" + res.key + " ." + dest);
          if (e) {
            e.innerText = res.path.duration + " / " + res.path.distance;
          }
        });
  }
};
