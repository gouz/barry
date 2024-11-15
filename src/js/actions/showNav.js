window.$barry.showNav = (id, mode) => {
  Object.keys(window.$barry.layers).forEach((l, _) => {
    if (l.startsWith("route_")) {
      window.$barry.layers[l].setVisible(1 === mode ? l.startsWith(id) : true);
    }
  });
};
