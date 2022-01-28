import { fitToBox } from "../map/fitToBox";

window.$barry.zoom = (box) => {
  fitToBox(box);
};
