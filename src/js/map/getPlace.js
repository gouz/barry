import { addPoint } from "./addPoint";
import * as Gp from "geoportal-access-lib/dist/GpServices";

export const getPlace = (address, id) => {
  if (address.trim() != "") {
    return Gp.Services.geocode({
      location: address,
      apiKey: "calcul",
      onSuccess: (result) => {
        addPoint(
          result.locations[0].position.y,
          result.locations[0].position.x,
          window.$barry.addressColor,
          id
        );
      },
      onFailure: (error) => {
        alert(error);
      },
    });
  } else {
    window.$barry.canCalculate();
  }
};
