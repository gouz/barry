window.$barry.showPOI = (category_type) => {
  document
    .querySelectorAll("#pois a")
    .forEach((a) => a.classList.remove("active"));
  document
    .querySelector(`#pois a[data-cat="${category_type}"]`)
    .classList.add("active");
  if (Object.keys(window.$barry.pois).length == 0) {
    window.$barry.tourisme().then((pois) => {
      pois.forEach((p) => {
        window.$barry.pois[`poi_${p.identifier}`] = p;
      });
      window.$barry.managePOI(category_type);
    });
  } else {
    window.$barry.managePOI(category_type);
  }
};
