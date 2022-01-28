export const calcPath = (start, end, key, routeInstructions = false) => {
  return fetch(
    `https://wxs.ign.fr/calcul/geoportail/itineraire/rest/1.0.0/route?resource=bdtopo-osrm&profile=car&optimization=${
      window.$barry.calculateMode == "time" ? "fastest" : "shortest"
    }&start=${start.join(",")}&end=${end.join(
      ","
    )}&getSteps=${routeInstructions}`
  )
    .then(function (response) {
      return response.json();
    })
    .then(function (responseJSON) {
      responseJSON.key = key;
      return responseJSON;
    });
};
