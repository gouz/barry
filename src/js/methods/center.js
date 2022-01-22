export const center = () => {
  return new Promise((resolve) => {
    const box = window.$barry.calcBox();
    window.$barry.log(
      "Je détermine les latitudes et longitudes minimales et maximales pour définir un cadre et je calcule le centre du cadre."
    );
    resolve([(box[1][1] + box[0][1]) / 2, (box[1][0] + box[0][0]) / 2]);
  });
};
