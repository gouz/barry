export const detectNearCity = (point) => {
  const query = `<?xml version="1.0" encoding="UTF-8"?>
<XLS version="1.2"
  xmlns="http://www.opengis.net/xls"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/xls http://schemas.opengis.net/ols/1.2/olsAll.xsd">
    <RequestHeader/>
    <Request methodName="ReverseGeocodeRequest" maximumResponses="10" requestID="abc" version="1.2">
       <ReverseGeocodeRequest>
          <ReverseGeocodePreference>StreetAddress</ReverseGeocodePreference>
          <Position>
             <gml:Point>
                <gml:pos>${point[1]} ${point[0]}</gml:pos>
             </gml:Point>
             <gml:CircleByCenterPoint>
                <gml:pos>${point[1]} ${point[0]}</gml:pos>
                <gml:radius>200</gml:radius>
             </gml:CircleByCenterPoint>
          </Position>
       </ReverseGeocodeRequest>
  </Request>
</XLS>`;
  return fetch(
    `https://wxs.ign.fr/calcul/geoportail/ols?xls=${encodeURI(
      query
    )}&output=json`
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
      const commune = doc.querySelector('Place[type="Commune"]');
      if (commune != null) {
        window.$barry.log(
          `On se retrouve donc à <b>${commune.textContent}</b>`
        );
        const location = doc.querySelector("gml-pos").textContent.split(" ");
        return [location[1], location[0]];
      }
      return point;
    });
};
