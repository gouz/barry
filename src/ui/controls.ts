import { settings } from "../state.ts";
import { el, show } from "./dom.ts";

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

  const transport = el<HTMLInputElement>("toggleCalcTransport");
  transport.addEventListener("change", () => {
    settings.transport = transport.checked ? "pedestrian" : "car";
  });

  const avoidMotorways = el<HTMLInputElement>("toggleAvoidMotorways");
  avoidMotorways.addEventListener("change", () => {
    settings.avoidMotorways = avoidMotorways.checked;
  });

  bindCollapse("toggleConfiguration", el("configuration"));
  bindCollapse("toggleWelcome", el("welcome-body"));
}

/** Reflète l'état dans les interrupteurs (au chargement d'un permalien). */
export function syncControls(): void {
  el<HTMLInputElement>("toggleCalcMode").checked = settings.mode === "distance";
  el<HTMLInputElement>("toggleCalcTransport").checked =
    settings.transport === "pedestrian";
  el<HTMLInputElement>("toggleAvoidMotorways").checked =
    settings.avoidMotorways;
}
