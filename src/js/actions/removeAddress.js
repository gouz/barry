window.$barry.removeAddress = (id) => {
  window.$barry.nbPlaces--;
  const el = document.getElementById(id);
  el.parentNode.removeChild(el);
};
