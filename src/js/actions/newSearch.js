import { zoomToFrance } from "../map/zoomToFrance";

window.$barry.newSearch = () => {
  window.$barry.$log.classList.add("hide");
  window.$barry.$newsearch.classList.add("hide");
  window.$barry.$rappel.classList.remove("hide");
  document.querySelectorAll(".address").forEach((e, _) => {
    e.parentNode.removeChild(e);
  });
  window.$barry.addressesCount = 0;
  window.$barry.places = {};
  Object.keys(window.$barry.layers).forEach((id, _) => {
    window.$barry.map.removeLayer(window.$barry.layers[id]);
  });
  window.$barry.layers = {};
  window.$barry.newAddress();
  zoomToFrance();
  window.$barry.$pois.classList.remove("hide");
  window.$barry.pois = [];
  window.location.hash = "";
};
