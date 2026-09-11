import "./css/app.css";
import "ol/ol.css";

import { type Activity, onActivity, onWait } from "./api/world/client.ts";
import { route } from "./api/world/osrm.ts";
import { complete, findNearestCity, geocode } from "./api/world/photon.ts";
import { boundingBox, haversine } from "./compute/geometry.ts";
import { meetingPoint } from "./compute/meetingPoint.ts";
import { COLORS, METHODS, WORLD_BOX } from "./config.ts";
import { EN } from "./i18n/en.ts";
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
import type { Box, Coord } from "./types.ts";
import {
  addRow,
  addRowWith,
  canCalculate,
  clearRows,
  initAddresses,
  lockRows,
} from "./ui/addresses.ts";
import { initControls, lockControls, syncControls } from "./ui/controls.ts";
import { el, show } from "./ui/dom.ts";
import { expandMap, initLayout, resetLayout, reveal } from "./ui/layout.ts";
import { clearLog, closeLog, initLog, log, openLog } from "./ui/log.ts";
import { decodePermalink, encodePermalink } from "./ui/permalink.ts";

/**
 * Page monde.
 *
 * Même méthode, même carte, même journal que la page française : seuls
 * changent les services interrogés — Photon pour les lieux, OSRM pour les
 * routes — et la langue. Le calcul lui-même vit dans `compute/`, partagé par
 * les deux pages, et reçoit ici son fournisseur d'itinéraires et ses phrases.
 *
 * OSRM ne connaissant que la voiture et ne sachant pas éviter les autoroutes,
 * cette page ne propose ni l'un ni l'autre réglage : `settings` garde ses
 * valeurs par défaut pour ces deux champs.
 */

type Located = Address & { coord: Coord };

const calculateButton = el<HTMLButtonElement>("calculate");
const newSearchButton = el<HTMLButtonElement>("newsearch");
const spinner = el("spinner");
const rappel = el("rappel");
const status = el("status");
const statusText = el("status-text");

/**
 * Vrai entre le clic sur « Calculer » et la remise à zéro.
 *
 * Hors de cette fenêtre, seule une saturation mérite d'être signalée : le
 * géocodage d'une adresse a déjà son propre indicateur sur la ligne concernée.
 */
let showingResult = false;
let countdown: number | undefined;

/** Reflète l'activité réseau : requêtes en cours, et décompte des pauses. */
function renderActivity({ running, throttledUntil }: Activity): void {
  if (countdown !== undefined) {
    window.clearInterval(countdown);
    countdown = undefined;
  }

  if (throttledUntil > 0) {
    show(status, true);
    const tick = () => {
      const left = Math.max(0, Math.ceil((throttledUntil - Date.now()) / 1000));
      if (left === 0) {
        renderActivity({ running, throttledUntil: 0 });
        return;
      }
      statusText.textContent = `The service is busy, waiting ${left} s…`;
    };
    tick();
    countdown = window.setInterval(tick, 500);
    return;
  }

  if (!showingResult || running === 0) {
    show(status, false);
    return;
  }
  show(status, true);
  statusText.textContent =
    running === 1 ? "One request in flight…" : `${running} requests in flight…`;
}

function refreshCalculateButton(): void {
  show(calculateButton, canCalculate());
}

/**
 * Itinéraires d'illustration en cours de calcul.
 *
 * Ils survivent à l'affichage du résultat : on les abandonne explicitement
 * quand l'utilisateur repart de zéro, pour ne pas solliciter les serveurs au
 * profit d'un journal qui vient d'être effacé.
 */
let pendingRoutes: AbortController | undefined;

function cancelPendingRoutes(): void {
  pendingRoutes?.abort();
  pendingRoutes = undefined;
}

/**
 * Trace les trajets des villes vers le point de rencontre.
 *
 * Ces itinéraires n'illustrent que le résultat déjà trouvé : plutôt que de
 * faire attendre l'affichage, on montre tout de suite la ligne droite et son
 * estimation à vol d'oiseau, et chaque trajet réel remplace son estimation dès
 * qu'il arrive.
 */
function drawRoutesToMeetingPoint(
  target: Coord,
  addresses: readonly Located[],
): void {
  log("I am computing the trip from each city.", true);
  const options = {
    mode: settings.mode,
    transport: settings.transport,
    avoidMotorways: settings.avoidMotorways,
  };

  const controller = new AbortController();
  pendingRoutes = controller;

  for (const address of addresses) {
    const id = `route_${address.id}`;
    addRoad(
      id,
      { type: "LineString", coordinates: [address.coord, target] },
      COLORS.roadHint,
      2,
      true,
    );

    const line = log(
      `From ${address.label}, about ${EN.distance(haversine(address.coord, target))} as the crow flies, computing the trip…`,
    );
    line.classList.add("route-link");

    // Réajusté sur l'itinéraire réel dès qu'il est connu ; d'ici là, le clic
    // cadre la ligne droite.
    let box: Box = boundingBox([address.coord, target]);

    void route(address.coord, target, options, controller.signal)
      .then((itinerary) => {
        addRoad(id, itinerary.geometry, COLORS.road, 4);
        box = itinerary.box;
        line.textContent = `From ${address.label}, it is ${EN.distance(itinerary.distance)} in ${EN.duration(itinerary.duration)}`;
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        line.textContent = `From ${address.label}, about ${EN.distance(haversine(address.coord, target))} as the crow flies (no road trip available)`;
        line.title =
          error instanceof Error ? error.message : "Trip unavailable";
      });

    line.addEventListener("mouseenter", () => {
      highlightRoad(id);
    });
    line.addEventListener("mouseleave", () => {
      highlightRoad(null);
    });
    line.addEventListener("click", () => {
      fitTo(box);
    });
  }
}

async function calculate(): Promise<void> {
  const addresses = locatedAddresses();
  if (addresses.length < 2) return;

  cancelPendingRoutes();
  showingResult = true;
  lockRows(true);
  lockControls(true);
  show(rappel, false);
  calculateButton.disabled = true;
  show(spinner, true);
  clearLog();
  openLog();
  reveal(el("log"));

  const stopWatching = onWait(({ delay }) => {
    log(
      `The service asked me to slow down, retrying in ${Math.round(delay / 1000)} s.`,
    );
  });

  location.hash = encodePermalink(
    settings,
    addresses.map((a) => a.label),
  );
  log("Let's find your fair meeting point");

  try {
    const { coord, byMethod } = await meetingPoint(addresses, {
      ...settings,
      route,
      texts: EN,
      log,
    });
    for (const [id, methodCoord] of byMethod)
      addPoint(id, methodCoord, METHODS[id].color, 5);
    log(`We meet at [${coord[0]}, ${coord[1]}]`, true);

    log("I am looking for the nearest town to that point.", true);
    addPoint("result", coord, COLORS.result, 9);
    expandMap();

    const city = await findNearestCity(coord);
    if (!city) {
      log(
        "No town nearby, sorry — you will have to sort this one out by hand.",
      );
    } else {
      log(`So we meet in ${city.name}`);
      addPoint("result", city.coord, COLORS.result, 9);
      drawRoutesToMeetingPoint(city.coord, addresses);
      fitTo(boundingBox([...addresses.map((a) => a.coord), city.coord]));
    }
  } catch (error) {
    log(
      error instanceof Error
        ? error.message
        : "The calculation failed, please try again.",
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
  cancelPendingRoutes();
  showingResult = false;
  closeLog();
  show(newSearchButton, false);
  show(rappel, true);
  clearAll();
  clearRows();
  resetAddresses();
  lockRows(false);
  lockControls(false);
  addRow();
  refreshCalculateButton();
  fitTo();
  resetLayout();
  history.replaceState(null, "", location.pathname + location.search);
}

async function bootstrap(): Promise<void> {
  initMap(el("map"), WORLD_BOX);
  initLayout();
  initLog();
  onActivity(renderActivity);
  initControls();
  initAddresses({
    onChange: refreshCalculateButton,
    geocode,
    complete,
    notFound: EN.notFound,
  });

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
