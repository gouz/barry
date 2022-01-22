import { getPlace } from "../MapsUtils";

window.$barry.placePoint = (address, id) => {
  if (
    window.$barry.addressToCalc[id] &&
    window.$barry.$newsearch.classList.contains("hide")
  ) {
    window.$barry.addressToCalc[id] = false;
    window.$barry.$calculate.classList.add("hide");
    getPlace(address, id);
  }
};
