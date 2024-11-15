window.$barry.log = (msg, level) => {
  let lvl = level;
  if (typeof level === "undefined") {
    lvl = 0;
  }
  window.$barry.$logContent.innerHTML += `<p class="log-${lvl}${lvl > 0 ? " hide" : ""
    }">${msg}</p>`;
};
