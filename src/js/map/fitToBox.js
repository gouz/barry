import { boundingExtent } from "ol/extent";

export const fitToBox = (box) => {
  let bbox = box;
  if (typeof box === "undefined") {
    bbox = window.$barry.calcBox();
  }
  const ext = boundingExtent([
    [bbox[0][1], bbox[0][0]],
    [bbox[1][1], bbox[1][0]],
  ]);
  window.$barry.map.getView().fit(ext, {
    size: window.$barry.map.getSize(),
    padding: [50, 50, 50, 50],
    duration: 2000,
  });
};
