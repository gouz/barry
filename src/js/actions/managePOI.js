import { addPoint } from "../MapsUtils";

window.$barry.managePOI = (category) => {
  window.$barry.pois.forEach((poi) => {
    if (poi.categories.includes(category)) {
      addPoint(
        poi.longitude,
        poi.latitude,
        "#131282",
        `poi_${poi.identifier}`,
        3
      );
    }
  });
};
