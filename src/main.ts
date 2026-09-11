import "./css/app.css";
import "ol/ol.css";

import { type Activity, onActivity, onWait } from "./api/client.ts";
import { complete } from "./api/complete.ts";
import { findNearestCity, geocode } from "./api/geocode.ts";
import { route } from "./api/route.ts";
import { boundingBox, haversine } from "./compute/geometry.ts";
import { meetingPoint } from "./compute/meetingPoint.ts";
import { COLORS, FRANCE_BOX, METHODS } from "./config.ts";
import { FR } from "./i18n/fr.ts";
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

/**
 * Reflète l'activité réseau : requêtes en cours, et surtout décompte de la
 * pause quand l'IGN nous demande de ralentir. Le 429 est ainsi vécu comme une
 * attente annoncée plutôt que comme une erreur.
 */
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
        // La pause est écoulée : on reprend l'affichage normal sans attendre
        // qu'une requête signale la reprise — elle a pu être abandonnée.
        renderActivity({ running, throttledUntil: 0 });
        return;
      }
      statusText.textContent = `Le service IGN est saturé, je patiente ${left} s…`;
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
    running === 1 ? "Une requête en cours…" : `${running} requêtes en cours…`;
}

function refreshCalculateButton(): void {
  show(calculateButton, canCalculate());
}

/**
 * Itinéraires d'illustration en cours de calcul.
 *
 * Ils survivent à l'affichage du résultat : on les abandonne explicitement
 * quand l'utilisateur repart de zéro, pour ne pas consommer le quota IGN au
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
 * qu'il arrive. La file d'attente du client espace ces requêtes sans que la
 * latence se voie.
 */
function drawRoutesToMeetingPoint(
  target: Coord,
  addresses: readonly Located[],
): void {
  log("Je calcule le trajet pour chaque ville.", true);
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
      `De ${address.label}, environ ${FR.distance(haversine(address.coord, target))} à vol d'oiseau, je calcule le trajet…`,
    );
    line.classList.add("route-link");

    // Réajusté sur l'itinéraire réel dès qu'il est connu ; d'ici là, le clic
    // cadre la ligne droite.
    let box: Box = boundingBox([address.coord, target]);

    void route(address.coord, target, options, controller.signal)
      .then((itinerary) => {
        addRoad(id, itinerary.geometry, COLORS.road, 4);
        box = itinerary.box;
        line.textContent = `De ${address.label}, il y a ${FR.distance(itinerary.distance)} en ${FR.duration(itinerary.duration)}`;
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        line.textContent = `De ${address.label}, environ ${FR.distance(haversine(address.coord, target))} à vol d'oiseau (trajet indisponible)`;
        line.title =
          error instanceof Error ? error.message : "Trajet indisponible";
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
  // Le spinner vit dans le bouton : celui-ci reste visible pendant le calcul,
  // et n'est masqué qu'une fois le résultat affiché.
  calculateButton.disabled = true;
  show(spinner, true);
  clearLog();
  openLog();
  // Sur petit écran, le journal vient de naître tout en bas : sans cela, le
  // calcul se déroulerait hors champ.
  reveal(el("log"));

  const stopWatching = onWait(({ delay }) => {
    log(
      `Le service IGN me demande de patienter, je réessaie dans ${Math.round(delay / 1000)} s.`,
    );
  });

  location.hash = encodePermalink(
    settings,
    addresses.map((a) => a.label),
  );
  log("C'est parti pour rechercher votre point de rencontre équitable");

  try {
    const { coord, byMethod } = await meetingPoint(addresses, {
      ...settings,
      route,
      texts: FR,
      log,
    });
    for (const [id, methodCoord] of byMethod)
      addPoint(id, methodCoord, METHODS[id].color, 5);
    log(`On se retrouve à [${coord[0]}, ${coord[1]}]`, true);

    log("Je cherche la ville la plus proche du point.", true);
    addPoint("result", coord, COLORS.result, 9);
    expandMap();

    const city = await findNearestCity(coord);
    if (!city) {
      log(
        "Pas de ville trouvée proche, je suis désolé mais va falloir le faire à la main.",
      );
    } else {
      log(`On se retrouve donc à ${city.name}`);
      addPoint("result", city.coord, COLORS.result, 9);
      drawRoutesToMeetingPoint(city.coord, addresses);
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
  initMap(el("map"), FRANCE_BOX);
  initLayout();
  initLog();
  onActivity(renderActivity);
  initControls();
  initAddresses({
    onChange: refreshCalculateButton,
    geocode,
    complete,
    notFound: FR.notFound,
  });

  calculateButton.addEventListener("click", () => {
    void calculate();
  });
  newSearchButton.addEventListener("click", newSearch);

  fitTo();

  const permalink = decodePermalink(location.hash);
  if (permalink) {
    settings.mode = permalink.mode;
    settings.transport = permalink.transport;
    settings.avoidMotorways = permalink.avoidMotorways;
    syncControls();
    for (const label of permalink.addresses) await addRowWith(label);
  }
  addRow();
  refreshCalculateButton();
}

void bootstrap();
