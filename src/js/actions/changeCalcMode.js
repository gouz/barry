window.$barry.changeCalcMode = () => {
  if ("time" === window.$barry.calculateMode) {
    window.$barry.calculateMode = "distance";
  } else {
    window.$barry.calculateMode = "time";
  }
};
