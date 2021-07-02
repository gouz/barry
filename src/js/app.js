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
let address_count = 1;

document.querySelector('#calc').addEventListener('click', () => {
    layers.forEach((layer) => {
        map.removeLayer(layer);
    });

    places = [];

    let getPlace = (address) => {
        return new Promise((resolve) => {
            geocoder
                .search({ q: address })
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
                    resolve();
                })
                .catch((error) => {
                    console.log(error);
                });
        })
    }

    let address = [];

    document.querySelectorAll("#address input").forEach((input) => {
        if (input.value.trim() != "")
            address.push(input.value);
    });

    let actions = address.map(getPlace);

    Promise.all(actions)
        .then(() => {
            if (places.length > 1)
                Gp.Services.route({
                    apiKey: "jhyvi0fgmnuxvfv0zjzorvdn", // api key found on npmjs
                    startPoint: { x: places[0][0], y: places[0][1] },
                    endPoint: { x: places[1][0], y: places[1][1] },
                    graph: "Voiture",
                    distanceUnit: "m",
                    onSuccess: function (result) {
                        const distance = result.totalDistance;
                        console.log(distance, result)
                    }
                });
        });

}, true)

window.newAddress = () => {
    const div = document.createElement("div");
    div.classList.add('flex');
    div.innerHTML = `
        <input id="address_${address_count++}"type="text" placeholder="Nouvelle adresse" />
        <button class="minus" onclick="window.removeAddress(this)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> 
            </svg>
        <button onclick="window.newAddress()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12H12M18 12H12M12 12V6M12 12V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
    `;
    document.querySelector('#address .wrapper').appendChild(div);
}

window.removeAddress = (element) => {
    element.parentNode.parentNode.removeChild(element.parentNode)
}