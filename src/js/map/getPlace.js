import { addPoint } from "./addPoint";
import * as Gp from "geoportal-access-lib/dist/GpServices";

export const getPlace = (address, id) => {
  if (address.trim() !== "") {
    return Gp.Services.geocode({
      location: address,
      ssl: true,
      apiKey: "essentiels",
      onSuccess: (result) => {
        addPoint(
          result.locations[0].position.lon,
          result.locations[0].position.lat,
          window.$barry.addressColor,
          id
        );
      },
      onFailure: (error) => {
        alert(error);
      },
    });
  }
  window.$barry.canCalculate();
};
