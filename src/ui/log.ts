import { el, show } from "./dom.ts";

let panel: HTMLElement;
let content: HTMLElement;
let toggle: HTMLInputElement;

export function initLog(): void {
  panel = el("log");
  content = el("log-content");
  toggle = el<HTMLInputElement>("toggleLogMode");
  toggle.addEventListener("change", () => {
    for (const line of content.querySelectorAll(".log-1"))
      show(line, toggle.checked);
  });
}

export function clearLog(): void {
  content.replaceChildren();
}

export function openLog(): void {
  show(panel, true);
}

export function closeLog(): void {
  show(panel, false);
}

/**
 * Ajoute une ligne au journal.
 *
 * On construit un nœud plutôt que de concaténer dans `innerHTML` : le panneau
 * n'est pas re-parsé à chaque ligne, et le texte utilisateur ne peut pas être
 * interprété comme du HTML.
 */
export function log(message: string, detailed = false): HTMLParagraphElement {
  const line = document.createElement("p");
  line.className = detailed ? "log-1" : "log-0";
  line.textContent = message;
  if (detailed && !toggle.checked) line.classList.add("hide");
  content.append(line);
  return line;
}
