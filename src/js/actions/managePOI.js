import { addPoint } from "../map/addPoint";

window.$barry.managePOI = (category) => {
  Object.keys(window.$barry.layers).forEach((id, _) => {
    if (id.startsWith("poi_")) {
      window.$barry.map.removeLayer(window.$barry.layers[id]);
    }
  });
  for (const p in window.$barry.pois) {
    const poi = window.$barry.pois[p];
    if (poi.categories.includes(category)) {
      addPoint(
        poi.longitude,
        poi.latitude,
        "#131282",
        `poi_${poi.identifier}`,
        3
      );
    }
  }
};
