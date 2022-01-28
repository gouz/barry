import { boundingExtent } from "ol/extent";

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
