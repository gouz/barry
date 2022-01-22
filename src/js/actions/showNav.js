window.$barry.showNav = (id, mode) => {
  Object.keys(window.$barry.layers).forEach((l) => {
    if (l.startsWith(id)) {
      window.$barry.layers[l].setOpacity(1 == mode ? 1 : 0.5);
    }
  });
};
