import type { CompleteFn, Suggestion } from "../types.ts";
import { show } from "./dom.ts";

/**
 * Liste de propositions sous un champ d'adresse.
 *
 * Motif ARIA « combobox » : le champ garde le focus du début à la fin, la
 * liste n'est qu'un affichage piloté par `aria-activedescendant`. C'est ce qui
 * permet au clavier et au doigt de se comporter pareil sans code séparé.
 *
 * Le service de complétion est reçu en paramètre : la liste ne sait pas si elle
 * interroge l'IGN ou Photon.
 */

/** En deçà, toutes les villes de France répondent : la liste n'apprend rien. */
const MIN_CHARS = 3;
/** Le temps d'une frappe rapide : on n'interroge pas le service à chaque lettre. */
const DEBOUNCE = 220;

export interface Suggest {
  /**
   * Retient la proposition mise en avant, s'il y en a une.
   *
   * C'est le champ qui décide quand : la touche Entrée appartient déjà au
   * formulaire, qui la consulte avant de valider la frappe brute.
   */
  pickActive(): Suggestion | null;
  close(): void;
  /** Coupe tout ce qui est en vol : la ligne vient d'être retirée. */
  destroy(): void;
}

export function attachSuggest(
  input: HTMLInputElement,
  list: HTMLElement,
  onPick: (suggestion: Suggestion) => void,
  complete: CompleteFn,
): Suggest {
  let items: Suggestion[] = [];
  let active = -1;
  let timer: number | undefined;
  let controller: AbortController | undefined;

  function close(): void {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    controller?.abort();
    controller = undefined;
    items = [];
    active = -1;
    list.replaceChildren();
    show(list, false);
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function highlight(next: number): void {
    const options = [...list.children];
    for (const option of options) option.setAttribute("aria-selected", "false");
    active = next;
    const option = options[active];
    if (!option) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    option.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", option.id);
    option.scrollIntoView({ block: "nearest" });
  }

  function pick(suggestion: Suggestion): void {
    close();
    onPick(suggestion);
  }

  function render(found: Suggestion[]): void {
    items = found;
    active = -1;
    list.replaceChildren();

    for (const [index, suggestion] of found.entries()) {
      const option = document.createElement("div");
      option.id = `${list.id}_${index}`;
      option.className = "suggestion";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = suggestion.name;
      const kind = document.createElement("span");
      kind.className = "kind eyebrow";
      kind.textContent = suggestion.kind;
      option.append(name, kind);

      if (suggestion.detail) {
        const detail = document.createElement("span");
        detail.className = "detail";
        detail.textContent = suggestion.detail;
        option.append(detail);
      }

      // `click` et non `pointerdown` : au doigt, la liste se fait défiler en
      // posant le doigt sur une proposition, et ce geste ne doit rien choisir.
      // Le focus, lui, est retenu plus bas.
      option.addEventListener("click", () => {
        pick(suggestion);
      });
      list.append(option);
    }

    show(list, found.length > 0);
    input.setAttribute("aria-expanded", String(found.length > 0));
    input.removeAttribute("aria-activedescendant");
  }

  async function query(text: string): Promise<void> {
    controller?.abort();
    const own = new AbortController();
    controller = own;
    try {
      render(await complete(text, own.signal));
    } catch {
      // Une proposition manquante n'est pas un incident : le champ reste
      // saisissable et le géocodage tranchera à la validation.
      if (!own.signal.aborted) close();
    } finally {
      if (controller === own) controller = undefined;
    }
  }

  /*
   * Le champ garde le focus pendant qu'on vise une proposition : sans cela il
   * perdrait le focus avant le clic, la liste se fermerait, et le formulaire
   * partirait géocoder la frappe en cours au lieu du choix.
   */
  list.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  input.addEventListener("input", () => {
    if (timer !== undefined) window.clearTimeout(timer);
    const text = input.value.trim();
    if (input.readOnly || text.length < MIN_CHARS) {
      close();
      return;
    }
    timer = window.setTimeout(() => {
      timer = undefined;
      void query(text);
    }, DEBOUNCE);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (items.length > 0) event.stopPropagation();
      close();
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlight((active + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlight((active <= 0 ? items.length : active) - 1);
    }
  });

  // Le focus quitte la ligne : la liste n'a plus de raison d'être ouverte.
  input.addEventListener("blur", close);

  return {
    pickActive: () => {
      const suggestion = items[active];
      if (!suggestion) return null;
      close();
      return suggestion;
    },
    close,
    destroy: close,
  };
}
