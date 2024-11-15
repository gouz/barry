window.$barry.removeAddress = (id) => {
  let iid = id;
  window.$barry.nbPlaces--;
  const el = document.getElementById(id);
  el.parentNode.removeChild(el);
  iid = id.replace("address_", "place_");
  delete window.$barry.places[iid];
  window.$barry.map.removeLayer(window.$barry.layers[iid]);
  delete window.$barry.layers[iid];
};
