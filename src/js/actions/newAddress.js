window.$barry.newAddress = (id) => {
  if (typeof id != "undefined") {
    const el = document.getElementById(id);
    el.querySelector(".plus").classList.toggle("hide");
    el.querySelector(".minus").classList.toggle("hide");
  }
  const div = document.createElement("div");
  div.classList.add("address");
  div.id = `address_${window.$barry.addressesCount}`;
  div.innerHTML = `
<input type="text"
       placeholder="Adresse postale"
       onblur="window.$barry.placePoint(this.value, 'place_${window.$barry.addressesCount}');"
       data-city="place_${window.$barry.addressesCount}" />
<button class="minus hide" 
        onclick="window.$barry.removeAddress('address_${window.$barry.addressesCount}')">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
    </svg>
</button>
<button class="plus" 
        onclick="window.$barry.newAddress('address_${window.$barry.addressesCount}')">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
    </svg>
</button>
      `;
  window.$barry.$addressesWrapper.appendChild(div);
  window.$barry.addressesCount++;
  window.$barry.nbPlaces++;
};
