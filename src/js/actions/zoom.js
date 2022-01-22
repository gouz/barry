import { fitToBox } from "../MapsUtils";

window.$barry.zoom = (box) => {
  fitToBox(box);
};
