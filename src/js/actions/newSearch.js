window.$barry.newSearch = () => {
  window.$barry.$log.classList.add("hide");
  window.$barry.$newsearch.classList.add("hide");
  window.$barry.$calculate.classList.remove("hide");
  document.querySelectorAll(".address").forEach((e) => {
    e.parentNode.removeChild(e);
  });
  window.$barry.addressesCount = 0;
  window.$barry.places = {};
  Object.keys(window.$barry.layers).forEach((id) => {
    window.$barry.map.removeLayer(window.$barry.layers[id]);
  });
  window.$barry.layers = {};
  window.$barry.newAddress();
};
