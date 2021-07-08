import { getPlace } from "./MapsUtils";

export function windowInit() {
  window.address_count = 0;
  window.newAddress = () => {
    const div = document.createElement("div");
    div.classList.add("wrap");
    div.innerHTML = `
          <input id="address_${window.address_count}"type="text" placeholder="Adresse postale" onblur="window.placePoint(this.value, 'place_${window.address_count}');" data-city="place_${window.address_count}" />
          <button class="minus" onclick="window.removeAddress(this)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /> 
              </svg>
          </button>
          <button onclick="window.newAddress()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12H12M18 12H12M12 12V6M12 12V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
          </button>
          <div id="res_${window.address_count}">
            <span class="first"></span>
            <span class="second"></span>
            <span class="third"></span>
            <span class="result"></span>
          </div>
      `;
    document.querySelector("#addresses #wrapper").appendChild(div);
    window.address_count++;
    window.nbPlaces++;
  };
  newAddress();

  window.removeAddress = (element) => {
    window.nbPlaces--;
    element.parentNode.parentNode.removeChild(element.parentNode);
  };

  window.placePoint = (address, id) => {
    getPlace(address, id);
  };

  window.log = (message) => {
    document.querySelector("#log").innerHTML += `<p>${message}</p>`;
  };

  window.hideWIP = () => {
    document.querySelector("#wip").style.display = "none";
  };
}
