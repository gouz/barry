import { fitToBox } from "../map/fitToBox";

window.$barry.tourisme = () => {
  const url = new URL(window.$barry.urlTourismAPI);
  const coord = window.$barry.meetPoint;
  const params = {
    lat_min: Number.parseFloat(coord[1]) - 0.2,
    lat_max: Number.parseFloat(coord[1]) + 0.2,
    lng_min: Number.parseFloat(coord[0]) - 0.3,
    lng_max: Number.parseFloat(coord[0]) + 0.3,
  };
  Object.keys(params).forEach((key, _) =>
    url.searchParams.append(key, params[key])
  );
  const box = [
    [params.lat_min, params.lng_min],
    [params.lat_max, params.lng_max],
  ];
  fitToBox(box);

  return fetch(url)
    .then((response) => {
      return response.text();
    })
    .then((responseBody) => {
      try {
        return JSON.parse(responseBody);
      } catch (error) {
        return responseBody;
      }
    });
};
