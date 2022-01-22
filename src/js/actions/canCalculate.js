window.$barry.canCalculate = () => {
  if (Object.keys(window.$barry.places).length > 1) {
    window.$barry.$calculate.classList.remove("hide");
  } else {
    window.$barry.$calculate.classList.add("hide");
  }
};
