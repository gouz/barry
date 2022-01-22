window.$barry.log = (msg, level) => {
  if (typeof level == "undefined") {
    level = 0;
  }
  window.$barry.$logContent.innerHTML += `<p class="log-${level}${
    level > 0 ? " hide" : ""
  }">${msg}</p>`;
};
