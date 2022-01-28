import { Circle, Fill, Style } from "ol/style";
import { Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol/index";

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
