window.$barry.changeCalcTransport = () => {
  if ("Voiture" === window.$barry.calculateTransport) {
    window.$barry.calculateTransport = "Pieton";
  } else {
    window.$barry.calculateTransport = "Voiture";
  }
};
