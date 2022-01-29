let api_key = "jhyvi0fgmnuxvfv0zjzorvdn";
if (window.location.hostname == "gouz.github.io")
  api_key = "ky6zjp5bxnmd49ausjpfuzkj"; // only available for REFERER = gouz.github.io

window.$barry = {
  methods: {
    longMiddle: {
      label:
        "Le mi-chemin en temps sur le plus long trajet entre toutes les villes",
      color: "#10b981",
    },
    average: {
      label: "La moyenne des coordonnées des villes",
      color: "#3b82f6",
    },
    center: {
      label: "Le centre du cadre dans lequel toutes les villes sont présentes",
      color: "#f59e0b",
    },
  },
  addressColor: "#111827",
  resultColor: "#EF4444",
  roadColor: "#47695B",
  calculateMode: "time",
  addressesCount: 0,
  places: {},
  layers: {},
  addressToCalc: {},
  urlTourismAPI: "https://titi.gougouzian.fr",
  tourismCategory: [
    "Sports",
    "Cultural",
    "Hotel",
    "Food",
    "Camping",
    "Event",
    "Tour",
  ],
  api_key: api_key,
  pois: {},
  $addressesWrapper: document.getElementById("addresses-wrapper"),
  $augmentWelcome: document.getElementById("augmentWelcome"),
  $calculate: document.getElementById("calculate"),
  $log: document.getElementById("log"),
  $logContent: document.getElementById("log-content"),
  $newsearch: document.getElementById("newsearch"),
  $reduceWelcome: document.getElementById("reduceWelcome"),
  $pois: document.getElementById("pois"),
  $spinner: document.getElementById("spinner"),
  $toggleCalcMode: document.getElementById("toggleCalcMode"),
  $toggleLogMode: document.getElementById("toggleLogMode"),
  $welcome: document.getElementById("welcome"),
  $popin: document.getElementById("popin"),
};
