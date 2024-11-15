window.$barry.changeCalcTransport = () => {
  if ("car" === window.$barry.calculateTransport) {
    window.$barry.calculateTransport = "pedestrian";
  } else {
    window.$barry.calculateTransport = "car";
  }
};
