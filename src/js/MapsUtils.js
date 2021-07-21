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

if (window.location.hostname == "gouz.github.io")
  api_key = "v8k37xmy29yqcx13k8czpanh"; // only available for REFERER = gouz.github.io

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
      center: [2.213749, 46.927638],
      zoom: 6.7,
    }),
  });
}

export const roundCoord = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const addPoint = (lon, lat, color, id, rad = 5) => {
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
        radius: rad,
        fill: new Fill({ color: color }),
      }),
    }),
  });
  window.layers[id] = layer;
  window.map.addLayer(layer);
};

export const calcPath = (
  start,
  end,
  key,
  raw = true,
  routeInstructions = false
) => {
  return new Promise((resolve) => {
    Gp.Services.route({
      apiKey: api_key,
      startPoint: { x: start[0], y: start[1] },
      endPoint: { x: end[0], y: end[1] },
      graph: "Voiture",
      distanceUnit: "m",
      routePreference: window.calcMode == "time" ? "fastest" : "shortest",
      geometryInInstructions: false,
      rawResponse: raw,
      geometryInInstructions: routeInstructions,
      onSuccess: (result) => {
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
          addPoint(response[0].lon, response[0].lat, "#111827", id);
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

export const drawMiddle = (middle, color, dest) => {
  const keys = Object.keys(window.places);
  let prms = [];
  for (let k = 0; k < keys.length; k++)
    if (keys[k].startsWith("place"))
      prms.push(
        new Promise((resolve) => {
          calcPath(window.places[keys[k]], middle, k, false).then((res) => {
            let e = document.querySelector(`#res_${res.key} .${dest}`);
            if (e) {
              const seconds = res.path.totalTime;
              const hours = Math.floor(seconds / 3600);
              const mins = Math.floor((seconds / 60) % 60);
              e.innerText = ` ${
                Math.round((100 * parseFloat(res.path.totalDistance)) / 1000) /
                100
              } km en ${hours}h${mins < 10 ? "0" + mins : mins}`;
            }
            const route = res.path.routeGeometry.coordinates;
            for (let i = 0; i < route.length; i += 20)
              addPoint(
                route[i][0],
                route[i][1],
                "#fef3c7",
                `route_${res.key}_${i}`,
                2
              );
            resolve();
          });
        })
      );
  window.log("Je calcule le trajet pour chaque ville.");
  Promise.all(prms).then(() => {
    addPoint(middle[0], middle[1], color, dest);
    document.querySelector(".spinner").style.display = "none";
    window.log(
      `<a href="#" onclick="window.hideWIP(); return false;">Voir les trajets</a>`
    );
  });
};

export const detectNearCity = (point) => {
  return new Promise((resolve) => {
    Gp.Services.reverseGeocode({
      apiKey: api_key,
      position: { x: point[1], y: point[0] },
      srs: "EPSG:4326",
      filterOptions: {
        type: ["PositionOfInterest"],
      },
      onSuccess: (result) => {
        const nbResults = result.locations.length;
        if (nbResults == 0) resolve([0, 0]);
        for (let i = 0; i < nbResults; i++) {
          if ("City" == result.locations[i].matchType) {
            window.log(
              `On se retrouve donc à <b>${result.locations[i].placeAttributes.commune}</b>`
            );
            resolve([
              result.locations[i].position.y,
              result.locations[i].position.x,
            ]);
            break;
          }
        }
      },
    });
  });
};
