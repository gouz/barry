import { settings } from "../state.ts";
import { el, show } from "./dom.ts";

/** Câble un couple de boutons réduire/agrandir sur une cible. */
function bindCollapse(
  reduceId: string,
  augmentId: string,
  target: HTMLElement,
): void {
  const reduce = el(reduceId);
  const augment = el(augmentId);
  const apply = (collapsed: boolean) => {
    show(target, !collapsed);
    show(reduce, !collapsed);
    show(augment, collapsed);
  };
  reduce.addEventListener("click", () => {
    apply(true);
  });
  augment.addEventListener("click", () => {
    apply(false);
  });
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

  bindCollapse(
    "reduceConfiguration",
    "augmentConfiguration",
    el("configuration"),
  );

  const welcomeBody = el("welcome").querySelector<HTMLElement>("div");
  if (welcomeBody) bindCollapse("reduceWelcome", "augmentWelcome", welcomeBody);
}

/** Reflète l'état dans les interrupteurs (au chargement d'un permalien). */
export function syncControls(): void {
  el<HTMLInputElement>("toggleCalcMode").checked = settings.mode === "distance";
  el<HTMLInputElement>("toggleCalcTransport").checked =
    settings.transport === "pedestrian";
  el<HTMLInputElement>("toggleAvoidMotorways").checked =
    settings.avoidMotorways;
}
