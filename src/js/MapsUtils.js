import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { boundingExtent } from "ol/extent";
import { Circle, Fill, Style } from "ol/style";
import { Point } from "ol/geom";
import { useGeographic } from "ol/proj";
import { Vector as VectorLayer } from "ol/layer";
import { OSM, Vector as VectorSource } from "ol/source";
import { Feature, Map, View } from "ol/index";
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
  window.$barry.map.on("pointermove", (event) => {
    window.$barry.map.forEachFeatureAtPixel(
      event.pixel,
      (feature, layer) => {
        if (feature.id_.startsWith("poi_")) {
          const poi = window.$barry.pois[feature.id_];
          window.$barry.$popin.innerHTML = `
<h3>${poi.label}</h3>
<p>${poi.description}</p>
<ul>
  <li>
    ${poi.address.replace(/\|/g, "<br />")}<br />${poi.postcode} ${poi.city}
  </li>
  <li>
    <a href="tel:${poi.phone}">${poi.phone}</a>
  </li>
  <li>
    <a href="mailto:${poi.mail}">${poi.mail}</a>
  </li>
</ul>
`;
          window.$barry.$popin.classList.remove("hide");
        } else {
          window.$barry.$popin.classList.add("hide");
        }
      },
      {
        layerFilter: (layer) => {
          return layer.type === new VectorLayer().type ? true : false;
        },
        hitTolerance: 6,
      }
    );
  });
};

export const zoomToFrance = () => {
  window.$barry.map.setView(
    new View({
      center: [2.213749, 46.927638],
      zoom: 6.7,
    })
  );
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
  const point = new Point(place);
  const feature = new Feature(point);
  feature.setId(id);
  const layer = new VectorLayer({
    source: new VectorSource({
      features: [feature],
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

export const calcPath = (start, end, key, routeInstructions = false) => {
  return fetch(
    `https://wxs.ign.fr/calcul/geoportail/itineraire/rest/1.0.0/route?resource=bdtopo-osrm&profile=car&optimization=${
      window.$barry.calculateMode == "time" ? "fastest" : "shortest"
    }&start=${start.join(",")}&end=${end.join(
      ","
    )}&getSteps=${routeInstructions}`
  )
    .then(function (response) {
      return response.json();
    })
    .then(function (responseJSON) {
      responseJSON.key = key;
      return responseJSON;
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
  } else {
    window.$barry.canCalculate();
  }
};

export const drawMiddle = (middle, color, dest) => {
  const keys = Object.keys(window.$barry.places);
  let prms = [];
  for (let k = 0; k < keys.length; k++)
    if (keys[k].startsWith("place"))
      prms.push(
        new Promise((resolve) => {
          calcPath(window.$barry.places[keys[k]], middle, k, true).then(
            (res) => {
              const seconds = res.duration * 60;
              const hours = Math.floor(seconds / 3600);
              const mins = Math.floor((seconds / 60) % 60);
              const route = res.geometry.coordinates;
              const step = 7 * Object.keys(window.$barry.places).length;
              let minLon = 99;
              let maxLon = -99;
              let minLat = 99;
              let maxLat = -99;
              for (let i = 0; i < route.length; i += step) {
                const lo = parseFloat(route[i][0]);
                const la = parseFloat(route[i][1]);
                if (minLon > lo) minLon = lo;
                if (maxLon < lo) maxLon = lo;
                if (minLat > la) minLat = la;
                if (maxLat < la) maxLat = la;
                addPoint(
                  route[i][0],
                  route[i][1],
                  window.$barry.roadColor,
                  `route_${res.key}_${i}`,
                  2
                );
              }
              window.$barry.log(
                `
<span onmouseenter="window.$barry.showNav('route_${res.key}', 1);"
      onmouseleave="window.$barry.showNav('route_${res.key}', 0)"
      onclick="window.$barry.zoom([[${minLat}, ${minLon}],[${maxLat}, ${maxLon}]])"
>
  De 
  <b>
    ${document.querySelector(`input[data-city="${keys[k]}"]`).value}
  </b>
  , il y 
  <b>
    ${Math.round((100 * parseFloat(res.distance)) / 1000) / 100}
  </b>
  km en
  <b>
    ${hours} h ${mins < 10 ? "0" + mins : mins}
  </b>
</span>`
              );
              resolve();
            }
          );
        })
      );
  window.$barry.log("Je calcule le trajet pour chaque ville.", 1);
  Promise.all(prms).then(() => {
    addPoint(middle[0], middle[1], color, dest);
  });
};

export const detectNearCity = (point) => {
  const query = `%3c%3fxml+version%3d%221.0%22+encoding%3d%22UTF-8%22%3f%3e%0d%0a%3cXLS+version%3d%221.2%22%0d%0a++xmlns%3d%22http%3a%2f%2fwww.opengis.net%2fxls%22%0d%0a++xmlns%3agml%3d%22http%3a%2f%2fwww.opengis.net%2fgml%22%0d%0a++xmlns%3axsi%3d%22http%3a%2f%2fwww.w3.org%2f2001%2fXMLSchema-instance%22%0d%0a++xsi%3aschemaLocation%3d%22http%3a%2f%2fwww.opengis.net%2fxls+http%3a%2f%2fschemas.opengis.net%2fols%2f1.2%2folsAll.xsd%22%3e%0d%0a++++%3cRequestHeader%2f%3e%0d%0a++++%3cRequest+methodName%3d%22ReverseGeocodeRequest%22+maximumResponses%3d%2210%22+requestID%3d%22abc%22+version%3d%221.2%22%3e%0d%0a+++++++%3cReverseGeocodeRequest%3e%0d%0a++++++++++%3cReverseGeocodePreference%3eStreetAddress%3c%2fReverseGeocodePreference%3e%0d%0a++++++++++%3cPosition%3e%0d%0a+++++++++++++%3cgml%3aPoint%3e%0d%0a++++++++++++++++%3cgml%3apos%3e${point[1]}+${point[0]}%3c%2fgml%3apos%3e%0d%0a+++++++++++++%3c%2fgml%3aPoint%3e%0d%0a++++++++++%3c%2fPosition%3e%0d%0a+++++++%3c%2fReverseGeocodeRequest%3e%0d%0a++%3c%2fRequest%3e%0d%0a%3c%2fXLS%3e`;
  return fetch(
    `https://wxs.ign.fr/${api_key}/geoportail/ols?xls=${query}&output=json`
  )
    .then(function (response) {
      return response.json();
    })
    .then(function (responseJSON) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        responseJSON.xml.replace(/gml:/g, "gml-"),
        "application/xml"
      );
      const commune = doc.querySelector('Place[type="Commune"]');
      console.log(commune);
      if (commune != null) {
        window.$barry.log(
          `On se retrouve donc à <b>${commune.textContent}</b>`
        );
        const location = doc.querySelector("gml-pos").textContent.split(" ");
        return [location[1], location[0]];
      }
      return point;
    });
};

export const fitToBox = (box) => {
  if (typeof box == "undefined") {
    box = window.$barry.calcBox();
  }
  var ext = boundingExtent([
    [box[0][1], box[0][0]],
    [box[1][1], box[1][0]],
  ]);
  window.$barry.map.getView().fit(ext, {
    size: window.$barry.map.getSize(),
    padding: [50, 50, 50, 50],
    duration: 2000,
  });
};
