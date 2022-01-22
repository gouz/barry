window.$barry.calcAddress = (event, place, address) => {
  if ("Enter" == event.key) {
    if ("" != address) {
      window.$barry.canPlace(`place_${place}`);
      window.$barry.placePoint(address, `place_${place}`);
      window.$barry.newAddress(`address_${window.$barry.addressesCount - 1}`);
      document
        .querySelector(`#address_${window.$barry.addressesCount - 1} input`)
        .focus();
    } else {
      if (Object.keys(window.$barry.places).length > 0) {
        window.$barry.removeAddress(`address_${place}`);
        const addresses = document.querySelectorAll(".address");
        addresses[addresses.length - 1]
          .querySelector(".plus")
          .classList.remove("hide");
        addresses[addresses.length - 1]
          .querySelector(".minus")
          .classList.add("hide");
      }
    }
  }
};
