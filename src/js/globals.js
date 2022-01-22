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
  $addressesWrapper: document.getElementById("addresses-wrapper"),
  $calculate: document.getElementById("calculate"),
  $log: document.getElementById("log"),
  $newsearch: document.getElementById("newsearch"),
  $spinner: document.getElementById("spinner"),
  $welcome: document.getElementById("welcome"),
  $reduceWelcome: document.getElementById("reduceWelcome"),
  $augmentWelcome: document.getElementById("augmentWelcome"),
};
