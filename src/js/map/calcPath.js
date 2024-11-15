import * as Gp from "geoportal-access-lib/dist/GpServices";

export const calcPath = (start, end, key, routeInstructions = false) => {
  const avoidFeature = [];
  if (!window.$barry.calculateToll) {
    avoidFeature.push("toll");
  }
  return new Promise((resolve) => {
    Gp.Services.route({
      startPoint: {
        x: start[0],
        y: start[1],
      },
      endPoint: {
        x: end[0],
        y: end[1],
      },
      graph: window.$barry.calculateTransport,
      exclusions: avoidFeature,
      routePreference:
        window.$barry.calculateMode == "time" ? "fastest" : "shortest",
      geometryInInstructions: routeInstructions,
      apiKey: "calcul",
      onSuccess: (result) => {
        result.key = key;
        resolve(result);
      },
      onFailure: (error) => {
        alert(error);
      },
    });
  });
};
