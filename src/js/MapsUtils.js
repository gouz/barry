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

//if (window.location.hostname == "gouz.github.io")
//  api_key = "v8k37xmy29yqcx13k8czpanh"; // only available for REFERER = gouz.github.io

export const mapInit = () => {
  window.$barry.layers = {};
  window.$barry.geocoder = new Nominatim({ secure: true });
  useGeographic();
  window.$barry.map = new Map({
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
};

export const roundCoord = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const addPoint = (lon, lat, color, id, rad = 5) => {
  let place = [lon, lat];
  if (typeof window.$barry.layers[id] != undefined)
    window.$barry.map.removeLayer(window.$barry.layers[id]);
  if (id.startsWith("place")) {
    window.$barry.places[id] = place;
    window.$barry.canCalculate();
  }
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
  window.$barry.layers[id] = layer;
  window.$barry.map.addLayer(layer);
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
      routePreference:
        window.$barry.calculateMode == "time" ? "fastest" : "shortest",
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
    return new Promise((resolve) => {
      window.$barry.geocoder
        .search({ q: address })
        .then((response) => {
          addPoint(
            response[0].lon,
            response[0].lat,
            window.$barry.addressColor,
            id
          );
          resolve();
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }
};

export const drawMiddle = (middle, color, dest) => {
  const keys = Object.keys(window.$barry.places);
  let prms = [];
  for (let k = 0; k < keys.length; k++)
    if (keys[k].startsWith("place"))
      prms.push(
        new Promise((resolve) => {
          calcPath(window.$barry.places[keys[k]], middle, k, false).then(
            (res) => {
              const seconds = res.path.totalTime;
              const hours = Math.floor(seconds / 3600);
              const mins = Math.floor((seconds / 60) % 60);
              window.$barry.log(
                `De <b>${
                  document.querySelector(`input[data-city="${keys[k]}"]`).value
                }</b>, il y <b>${
                  Math.round(
                    (100 * parseFloat(res.path.totalDistance)) / 1000
                  ) / 100
                }</b> km en <b>${hours}h${mins < 10 ? "0" + mins : mins}</b>`
              );
              const route = res.path.routeGeometry.coordinates;
              for (let i = 0; i < route.length; i += 20)
                addPoint(
                  route[i][0],
                  route[i][1],
                  window.$barry.roadColor,
                  `route_${res.key}_${i}`,
                  2
                );
              resolve();
            }
          );
        })
      );
  window.$barry.log("Je calcule le trajet pour chaque ville.");
  Promise.all(prms).then(() => {
    addPoint(middle[0], middle[1], color, dest);
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
            window.$barry.log(
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
