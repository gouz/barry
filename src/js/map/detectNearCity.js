import * as Gp from "geoportal-access-lib/dist/GpServices";

export const detectNearCity = (point) => {
  return new Promise((resolve) => {
    Gp.Services.reverseGeocode({
      position: {
        x: point[0],
        y: point[1],
      },
      filterOptions: {
        type: ["PositionOfInterest"], // type de localisant
        circle: {
          x: point[0],
          y: point[1],
          radius: 4
      } 
      },
      apiKey: "calcul", 
      onSuccess: function (result) {
        let found = false;
        result.locations.forEach((l) => {
          if (l.placeAttributes?.extrafields?.cleabs.startsWith("COMMUNE_") && !found) {
            found = true;
            window.$barry.log(
              `On se retrouve donc à <b>${l.placeAttributes.name}</b>`
            );
            resolve([l.position.lon, l.position.lat]);
          }
        });
        resolve(point);
      },
      onFailure: function (error) {
        alert(error);
        resolve(point);
      },
    });
  });
};
