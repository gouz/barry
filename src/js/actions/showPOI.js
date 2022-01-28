window.$barry.showPOI = (category_type) => {
  if (window.$barry.pois.length == 0) {
    window.$barry.tourisme().then((pois) => {
      window.$barry.pois = pois;
      window.$barry.managePOI(category_type);
    });
  } else {
    window.$barry.managePOI(category_type);
  }
};
