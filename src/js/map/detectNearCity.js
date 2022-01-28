let api_key = "jhyvi0fgmnuxvfv0zjzorvdn";
if (window.location.hostname == "gouz.github.io")
  api_key = "4s0umgz4cx4kz6lylojghete"; // only available for REFERER = gouz.github.io

export const detectNearCity = (point) => {
  // const query = `%3c%3fxml+version%3d%221.0%22+encoding%3d%22UTF-8%22%3f%3e%0d%0a%3cXLS+version%3d%221.2%22%0d%0a++xmlns%3d%22http%3a%2f%2fwww.opengis.net%2fxls%22%0d%0a++xmlns%3agml%3d%22http%3a%2f%2fwww.opengis.net%2fgml%22%0d%0a++xmlns%3axsi%3d%22http%3a%2f%2fwww.w3.org%2f2001%2fXMLSchema-instance%22%0d%0a++xsi%3aschemaLocation%3d%22http%3a%2f%2fwww.opengis.net%2fxls+http%3a%2f%2fschemas.opengis.net%2fols%2f1.2%2folsAll.xsd%22%3e%0d%0a++++%3cRequestHeader%2f%3e%0d%0a++++%3cRequest+methodName%3d%22ReverseGeocodeRequest%22+maximumResponses%3d%2210%22+requestID%3d%22abc%22+version%3d%221.2%22%3e%0d%0a+++++++%3cReverseGeocodeRequest%3e%0d%0a++++++++++%3cReverseGeocodePreference%3eStreetAddress%3c%2fReverseGeocodePreference%3e%0d%0a++++++++++%3cPosition%3e%0d%0a+++++++++++++%3cgml%3aPoint%3e%0d%0a++++++++++++++++%3cgml%3apos%3e${point[1]}+${point[0]}%3c%2fgml%3apos%3e%0d%0a+++++++++++++%3c%2fgml%3aPoint%3e%0d%0a++++++++++%3c%2fPosition%3e%0d%0a+++++++%3c%2fReverseGeocodeRequest%3e%0d%0a++%3c%2fRequest%3e%0d%0a%3c%2fXLS%3e`;
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
                <gml:radius>150</gml:radius>
             </gml:CircleByCenterPoint>
          </Position>
       </ReverseGeocodeRequest>
  </Request>
</XLS>`;
  return fetch(
    `https://wxs.ign.fr/${api_key}/geoportail/ols?xls=${encodeURI(
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
