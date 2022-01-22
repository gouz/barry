window.$barry.removeAddress = (id) => {
  window.$barry.nbPlaces--;
  const el = document.getElementById(id);
  el.parentNode.removeChild(el);
  id = id.replace("address_", "place_");
  delete window.$barry.places[id];
  window.$barry.map.removeLayer(window.$barry.layers[id]);
  delete window.$barry.layers[id];
};
