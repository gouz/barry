import { useGeographic } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import { Vector as VectorLayer } from "ol/layer";
import { OSM } from "ol/source";
import { Map, View } from "ol/index";

export const mapInit = () => {
  window.$barry.layers = {};
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
      zoom: 2,
    }),
  });
  window.$barry.map.on("pointermove", (event) => {
    window.$barry.map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
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
          return layer.type === new VectorLayer().type;
        },
        hitTolerance: 6,
      }
    );
  });
};
