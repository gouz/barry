import { refreshMapSize } from "../map/map.ts";
import { el } from "./dom.ts";

/**
 * Mise en page des petits écrans.
 *
 * Le partage entre la carte et le feuillet n'a pas de bonne valeur unique :
 * en saisie, on veut voir le formulaire ; à la lecture du résultat, la carte.
 * Plutôt que d'arbitrer, on rend la frontière déplaçable et on se contente
 * d'amener sous les yeux ce qui vient d'apparaître.
 */

/** Part de la hauteur revenant à la carte, en pourcentage. */
const MIN = 20;
const MAX = 78;
const DEFAULT = 42;
/** Détente de la carte quand le résultat s'affiche. */
const RESULT = 58;
/** Pas du clavier sur la poignée. */
const STEP = 4;

const compact = window.matchMedia("(width < 48rem)");

let app: HTMLElement;
let mapPane: HTMLElement;
let grip: HTMLElement;
let sidebar: HTMLElement;
let share = DEFAULT;
/** Vrai dès que l'utilisateur a déplacé la poignée : on ne décide plus à sa place. */
let adjusted = false;

function apply(next: number): void {
  share = Math.min(MAX, Math.max(MIN, next));
  app.style.setProperty("--map-h", `${share}%`);
  grip.setAttribute("aria-valuenow", String(Math.round(share)));
  refreshMapSize();
}

function startDrag(event: PointerEvent): void {
  if (!compact.matches) return;
  grip.setPointerCapture(event.pointerId);
  grip.classList.add("dragging");
  adjusted = true;

  /*
   * L'origine et la course sont relevées à la prise, sur les éléments
   * eux-mêmes : mesurer depuis `#app` obligerait à défalquer ses marges de
   * sécurité, et le filet décrocherait du doigt de la hauteur de l'encoche.
   */
  const origin = mapPane.getBoundingClientRect().top;
  const travel = sidebar.getBoundingClientRect().bottom - origin;
  const half = grip.offsetHeight / 2;
  let scheduled = 0;

  const move = (moved: PointerEvent) => {
    if (scheduled) return;
    // Un seul recalcul par image : le doigt va plus vite que le rendu.
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      apply(((moved.clientY - half - origin) / travel) * 100);
    });
  };
  const stop = () => {
    cancelAnimationFrame(scheduled);
    grip.classList.remove("dragging");
    grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", stop);
    grip.removeEventListener("pointercancel", stop);
    refreshMapSize();
  };

  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", stop);
  grip.addEventListener("pointercancel", stop);
}

function onKey(event: KeyboardEvent): void {
  const keys: Record<string, number> = {
    ArrowUp: share - STEP,
    ArrowDown: share + STEP,
    PageUp: share - STEP * 3,
    PageDown: share + STEP * 3,
    Home: MIN,
    End: MAX,
  };
  const next = keys[event.key];
  if (next === undefined) return;
  event.preventDefault();
  adjusted = true;
  apply(next);
}

export function initLayout(): void {
  app = el("app");
  mapPane = el("map");
  grip = el("grip");
  sidebar = el("sidebar");

  apply(DEFAULT);

  grip.addEventListener("pointerdown", startDrag);
  grip.addEventListener("keydown", onKey);
  // Un aller-retour rapide entre le partage courant et la carte au large :
  // le geste le plus fréquent ne doit pas demander de viser.
  grip.addEventListener("dblclick", () => {
    adjusted = true;
    apply(share >= RESULT ? DEFAULT : RESULT);
  });

  /*
   * Clavier virtuel : la ligne saisie doit rester visible au-dessus de la
   * barre d'action épinglée. Le décalage est laissé au navigateur via
   * `scroll-margin` (cf. _address.css).
   */
  sidebar.addEventListener("focusin", (event) => {
    if (!compact.matches) return;
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "text")
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  // Au passage d'un pli à l'autre — rotation de l'appareil, fenêtre
  // redimensionnée —, la carte change de logement : elle reprend sa mesure.
  compact.addEventListener("change", () => {
    refreshMapSize();
  });
}

/** Amène une section du feuillet en tête de la zone de défilement. */
export function reveal(target: HTMLElement): void {
  if (!compact.matches) return;
  target.scrollIntoView({ block: "start", behavior: "smooth" });
}

/**
 * Donne plus de place à la carte au moment où le résultat s'y dessine — sauf
 * si l'utilisateur a déjà réglé le partage lui-même.
 */
export function expandMap(): void {
  if (!compact.matches || adjusted || share >= RESULT) return;
  apply(RESULT);
}

/** Remet le feuillet en haut et la carte à son partage d'origine. */
export function resetLayout(): void {
  if (!compact.matches) return;
  sidebar.scrollTo({ top: 0, behavior: "smooth" });
  if (!adjusted) apply(DEFAULT);
}
