window.$barry.changeLogMode = () => {
  window.$barry.$log.querySelectorAll(".log-1").forEach((e, _) => {
    if (window.$barry.$toggleLogMode.checked) {
      e.classList.remove("hide");
    } else {
      e.classList.add("hide");
    }
  });
};
