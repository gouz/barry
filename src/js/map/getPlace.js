import { addPoint } from "./addPoint";

export const getPlace = (address, id) => {
  const query = `<?xml version="1.0" encoding="UTF-8"?>
<XLS
  xmlns:gml="http://www.opengis.net/gml"
  xmlns="http://www.opengis.net/xls"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.2"
  xsi:schemaLocation="http://www.opengis.net/xls http://schemas.opengis.net/ols/1.2/olsAll.xsd">
  <RequestHeader srsName="epsg:4326"/>
  <Request maximumResponses="25" methodName="GeocodeRequest" requestID="uid42" version="1.2">
  <GeocodeRequest returnFreeForm="false">
    <Address countryCode="StreetAddress">
      <freeFormAddress>${address}</freeFormAddress>
    </Address>
  </GeocodeRequest>
  </Request>
</XLS>`;
  if (address.trim() != "") {
    return fetch(
      `https://wxs.ign.fr/${
        window.$barry.api_key
      }/geoportail/ols?xls=${encodeURI(query)}&output=json`
    )
      .then(function (response) {
        return response.json();
      })
      .then(function (responseJSON) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
          responseJSON.xml.replace(/gml:/g, "gml-"),
          "application/xml"
        );
        const pos = doc.querySelector("gml-pos");
        if (pos != null) {
          const latlng = pos.textContent.split(" ");
          addPoint(latlng[1], latlng[0], window.$barry.addressColor, id);
        }
      });
  } else {
    window.$barry.canCalculate();
  }
};
