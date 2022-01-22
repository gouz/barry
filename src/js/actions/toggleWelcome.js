window.$barry.toggleWelcome = () => {
  window.$barry.$welcome.querySelector("div").classList.toggle("hide");
  window.$barry.$reduceWelcome.classList.toggle("hide");
  window.$barry.$augmentWelcome.classList.toggle("hide");
};
