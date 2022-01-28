import { addPoint } from "./addPoint";

export const getPlace = (address, id) => {
  if (address.trim() != "") {
    return new Promise((resolve) => {
      window.$barry.geocoder
        .search({ q: address })
        .then((response) => {
          addPoint(
            response[0].lon,
            response[0].lat,
            window.$barry.addressColor,
            id
          );
          resolve();
        })
        .catch((error) => {
          console.log(error);
        });
    });
  } else {
    window.$barry.canCalculate();
  }
};
