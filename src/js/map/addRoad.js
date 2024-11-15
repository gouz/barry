import { Stroke, Style } from "ol/style";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol/index";
import { GeoJSON } from "ol/format";

export const addRoad = (coordinates, color, id, size = 3) => {
  if (typeof window.$barry.layers[id] !== "undefined")
    window.$barry.map.removeLayer(window.$barry.layers[id]);
  const format = new GeoJSON();
  const feature = new Feature({
    geometry: format.readGeometry(coordinates),
  });
  feature.setId(id);
  feature.setStyle(
    new Style({
      stroke: new Stroke({
        color: color,
        width: size,
      }),
    })
  );
  const vectorSource = new VectorSource({
    features: [feature],
  });

  const vectorLayer = new VectorLayer({
    source: vectorSource,
  });

  window.$barry.layers[id] = vectorLayer;
  window.$barry.map.addLayer(vectorLayer);
};
