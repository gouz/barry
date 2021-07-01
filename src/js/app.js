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
import { Feature, Map, Overlay, View } from "ol/index";

useGeographic();

const map = new Map({
    target: "map",
    layers: [
        new TileLayer({
            source: new OSM(),
        }),
    ],
    view: new View({
        center: [0, 0],
        zoom: 0,
    }),
});

const Nominatim = require("nominatim-geocoder");
const geocoder = new Nominatim();

const Gp = require('geoportal-access-lib/dist/GpServices');

let layers = [];
let places = [];

document.querySelector('#calc').addEventListener('click', () => {
    layers.forEach((layer) => {
        map.removeLayer(layer);
    });

    places = [];

    document.querySelectorAll("#address input").forEach((input) => {
        geocoder
            .search({ q: input.value })
            .then((response) => {
                let place = [response[0].lon, response[0].lat];
                places.push(place);
                let point = new Point(place);
                const layer = new VectorLayer({
                    source: new VectorSource({
                        features: [new Feature(point)],
                    }),
                    style: new Style({
                        image: new Circle({
                            radius: 3,
                            fill: new Fill({ color: "red" }),
                        }),
                    }),
                });
                layers.push(layer);
                map.addLayer(layer);
            })
            .catch((error) => {
                console.log(error);
            });
    });


    setTimeout(() => {
        // a changer avec les promises
        Gp.Services.route({
            apiKey: "jhyvi0fgmnuxvfv0zjzorvdn",
            startPoint: { x: places[0][0], y: places[0][1] },
            endPoint: { x: places[1][0], y: places[1][1] },
            graph: "Voiture",
            distanceUnit: "m",
            onSuccess: function (result) {
                console.log(result)
            }
        });
    }, 5000);

}, true)

window.newAddress = () => {
    const html = document.querySelector('#address .wrapper .flex').innerHTML;
    document.querySelector('#address .wrapper').innerHTML += '<div class="flex">' + html + '</div>';
}

window.removeAddress = (element) => {
    element.parentNode.parentNode.removeChild(element.parentNode)
}