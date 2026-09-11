import { settings } from "../state.ts";
import { el, maybe, show } from "./dom.ts";

/**
 * Les interrupteurs qui déterminent le calcul, et donc à verrouiller pendant.
 *
 * Seul le premier est présent partout : la page monde ne propose ni le mode de
 * transport ni l'évitement des autoroutes, qu'OSRM ne sait pas honorer.
 */
const CALC_TOGGLES = [
  "toggleCalcMode",
  "toggleCalcTransport",
  "toggleAvoidMotorways",
] as const;

/**
 * Câble un bouton de repli sur une cible.
 *
 * L'état vit dans `aria-expanded` : il sert à la fois d'information pour les
 * lecteurs d'écran, de source de vérité au clic, et de sélecteur CSS pour
 * l'orientation du chevron.
 */
function bindCollapse(buttonId: string, target: HTMLElement): void {
  const button = el(buttonId);
  const apply = (expanded: boolean) => {
    show(target, expanded);
    button.setAttribute("aria-expanded", String(expanded));
  };
  button.addEventListener("click", () => {
    apply(button.getAttribute("aria-expanded") !== "true");
  });
  apply(button.getAttribute("aria-expanded") !== "false");
}

export function initControls(): void {
  const mode = el<HTMLInputElement>("toggleCalcMode");
  mode.addEventListener("change", () => {
    settings.mode = mode.checked ? "distance" : "time";
  });

  const transport = maybe<HTMLInputElement>("toggleCalcTransport");
  transport?.addEventListener("change", () => {
    settings.transport = transport.checked ? "pedestrian" : "car";
  });

  const avoidMotorways = maybe<HTMLInputElement>("toggleAvoidMotorways");
  avoidMotorways?.addEventListener("change", () => {
    settings.avoidMotorways = avoidMotorways.checked;
  });

  /*
   * Toutes les sections se replient. L'état de départ est écrit dans le HTML :
   * la méthode et les réglages arrivent fermés — on les consulte une fois, pas
   * à chaque recherche —, le formulaire et le journal ouverts. Seule l'action
   * « Calculer » échappe au pli, pour rester atteignable liste repliée.
   */
  bindCollapse("toggleWelcome", el("welcome-body"));
  bindCollapse("toggleConfiguration", el("configuration"));
  bindCollapse("toggleAddresses", el("addresses-body"));
  bindCollapse("toggleLog", el("log-body"));
}

/**
 * Verrouille les réglages de calcul.
 *
 * Pendant et après un calcul, les basculer n'aurait aucun effet : le résultat
 * affiché a figé ses paramètres. Plutôt que de laisser l'utilisateur agir dans
 * le vide, on désactive les interrupteurs jusqu'à la recherche suivante. Le
 * niveau de détail du journal, lui, reste manœuvrable : il ne touche pas au
 * calcul.
 */
export function lockControls(locked: boolean): void {
  for (const id of CALC_TOGGLES) {
    const toggle = maybe<HTMLInputElement>(id);
    if (toggle) toggle.disabled = locked;
  }
  el("configuration").setAttribute("aria-disabled", String(locked));
}

/** Reflète l'état dans les interrupteurs (au chargement d'un permalien). */
export function syncControls(): void {
  el<HTMLInputElement>("toggleCalcMode").checked = settings.mode === "distance";
  const transport = maybe<HTMLInputElement>("toggleCalcTransport");
  if (transport) transport.checked = settings.transport === "pedestrian";
  const avoidMotorways = maybe<HTMLInputElement>("toggleAvoidMotorways");
  if (avoidMotorways) avoidMotorways.checked = settings.avoidMotorways;
}
