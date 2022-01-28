import { View } from "ol/index";

export const zoomToFrance = () => {
  window.$barry.map.setView(
    new View({
      center: [2.213749, 46.927638],
      zoom: 6.7,
    })
  );
};
