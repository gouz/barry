import "./css/app.css";
import "ol/ol.css";

import { onWait } from "./api/client.ts";
import { findNearestCity } from "./api/geocode.ts";
import { route } from "./api/route.ts";
import {
  boundingBox,
  formatDistance,
  formatDuration,
} from "./compute/geometry.ts";
import { meetingPoint } from "./compute/meetingPoint.ts";
import { COLORS, METHODS } from "./config.ts";
import {
  addPoint,
  addRoad,
  clearAll,
  fitTo,
  highlightRoad,
  initMap,
} from "./map/map.ts";
import {
  type Address,
  locatedAddresses,
  resetAddresses,
  settings,
} from "./state.ts";
import type { Coord } from "./types.ts";
import {
  addRow,
  addRowWith,
  canCalculate,
  clearRows,
  initAddresses,
  lockRows,
} from "./ui/addresses.ts";
import { initControls, syncControls } from "./ui/controls.ts";
import { el, show } from "./ui/dom.ts";
import { clearLog, closeLog, initLog, log, openLog } from "./ui/log.ts";
import { decodePermalink, encodePermalink } from "./ui/permalink.ts";

type Located = Address & { coord: Coord };

const calculateButton = el<HTMLButtonElement>("calculate");
const newSearchButton = el<HTMLButtonElement>("newsearch");
const spinner = el("spinner");
const rappel = el("rappel");

function refreshCalculateButton(): void {
  show(calculateButton, canCalculate());
}

async function drawRoutesToMeetingPoint(
  target: Coord,
  addresses: readonly Located[],
): Promise<void> {
  log("Je calcule le trajet pour chaque ville.", true);
  const options = {
    mode: settings.mode,
    transport: settings.transport,
    avoidMotorways: settings.avoidMotorways,
  };
  const routes = await Promise.all(
    addresses.map((a) => route(a.coord, target, options)),
  );

  routes.forEach((itinerary, index) => {
    const address = addresses[index];
    if (!address) return;
    const id = `route_${address.id}`;
    addRoad(id, itinerary.geometry, COLORS.road);

    const line = log(
      `De ${address.label}, il y a ${formatDistance(itinerary.distance)} en ${formatDuration(itinerary.duration)}`,
    );
    line.classList.add("route-link");
    line.addEventListener("mouseenter", () => {
      highlightRoad(id);
    });
    line.addEventListener("mouseleave", () => {
      highlightRoad(null);
    });
    line.addEventListener("click", () => {
      fitTo(itinerary.box);
    });
  });
}

async function calculate(): Promise<void> {
  const addresses = locatedAddresses();
  if (addresses.length < 2) return;

  lockRows(true);
  show(rappel, false);
  // Le spinner vit dans le bouton : celui-ci reste visible pendant le calcul,
  // et n'est masqué qu'une fois le résultat affiché.
  calculateButton.disabled = true;
  show(spinner, true);
  clearLog();
  openLog();

  const stopWatching = onWait(({ delay }) => {
    log(
      `Le service IGN me demande de patienter, je réessaie dans ${Math.round(delay / 1000)} s.`,
    );
  });

  location.hash = encodePermalink(
    settings.mode,
    addresses.map((a) => a.label),
  );
  log("C'est parti pour rechercher votre point de rencontre équitable");

  try {
    const { coord, byMethod } = await meetingPoint(addresses, {
      ...settings,
      log,
    });
    for (const [id, methodCoord] of byMethod)
      addPoint(id, methodCoord, METHODS[id].color);
    log(`On se retrouve à [${coord[0]}, ${coord[1]}]`, true);

    log("Je cherche la ville la plus proche du point.", true);
    addPoint("result", coord, COLORS.result);

    const city = await findNearestCity(coord);
    if (!city) {
      log(
        "Pas de ville trouvée proche, je suis désolé mais va falloir le faire à la main.",
      );
    } else {
      log(`On se retrouve donc à ${city.name}`);
      addPoint("result", city.coord, COLORS.result);
      await drawRoutesToMeetingPoint(city.coord, addresses);
      fitTo(boundingBox([...addresses.map((a) => a.coord), city.coord]));
    }
  } catch (error) {
    log(
      error instanceof Error ? error.message : "Le calcul a échoué, réessayez.",
    );
  } finally {
    stopWatching();
    show(spinner, false);
    show(calculateButton, false);
    calculateButton.disabled = false;
    show(newSearchButton, true);
  }
}

function newSearch(): void {
  closeLog();
  show(newSearchButton, false);
  show(rappel, true);
  clearAll();
  clearRows();
  resetAddresses();
  lockRows(false);
  addRow();
  refreshCalculateButton();
  fitTo();
  history.replaceState(null, "", location.pathname + location.search);
}

async function bootstrap(): Promise<void> {
  initMap(el("map"));
  initLog();
  initControls();
  initAddresses(refreshCalculateButton);

  calculateButton.addEventListener("click", () => {
    void calculate();
  });
  newSearchButton.addEventListener("click", newSearch);

  fitTo();

  const permalink = decodePermalink(location.hash);
  if (permalink) {
    settings.mode = permalink.mode;
    syncControls();
    for (const label of permalink.addresses) await addRowWith(label);
  }
  addRow();
  refreshCalculateButton();
}

void bootstrap();
