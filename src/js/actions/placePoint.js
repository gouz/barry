import { getPlace } from "../MapsUtils";

window.$barry.placePoint = (address, id) => {
  window.$barry.$calculate.classList.add("hide");
  getPlace(address, id);
};
