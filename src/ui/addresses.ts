import { COLORS } from "../config.ts";
import { addPoint, removePoint } from "../map/map.ts";
import {
  createAddress,
  deleteAddress,
  getAddress,
  locatedAddresses,
} from "../state.ts";
import type { CompleteFn, Coord, GeocodeFn, Suggestion } from "../types.ts";
import { el, show } from "./dom.ts";
import { attachSuggest, type Suggest } from "./suggest.ts";

/** Ce que le formulaire doit savoir du monde extérieur : ses services et sa langue. */
export interface AddressesOptions {
  /** Prévient qu'une ligne a été résolue, vidée ou retirée. */
  onChange: () => void;
  geocode: GeocodeFn;
  complete: CompleteFn;
  /** Repli quand le service ne dit pas pourquoi l'adresse reste introuvable. */
  notFound: string;
}

let wrapper: HTMLElement;
let template: HTMLTemplateElement;
let config: AddressesOptions;
const onChange = () => {
  config.onChange();
};

/** Dernier libellé effectivement géocodé, pour ne pas rejouer la requête à chaque blur. */
const resolved = new Map<string, string>();

const pending = new Map<string, { label: string; task: Promise<void> }>();

/** Autocomplétion de chaque ligne, pour la couper quand la ligne disparaît. */
const suggests = new Map<string, Suggest>();

export function initAddresses(options: AddressesOptions): void {
  wrapper = el("addresses-wrapper");
  template = el<HTMLTemplateElement>("address-template");
  config = options;
}

export function addRow(focus = false): HTMLInputElement {
  const address = createAddress();
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const row = fragment.querySelector<HTMLElement>(".address");
  const input = fragment.querySelector<HTMLInputElement>("input");
  const list = fragment.querySelector<HTMLElement>(".suggestions");
  const minus = fragment.querySelector<HTMLButtonElement>(".minus");
  const plus = fragment.querySelector<HTMLButtonElement>(".plus");
  if (!row || !input || !list || !minus || !plus)
    throw new Error("Gabarit d'adresse incomplet");

  row.id = `address_${address.id}`;
  row.dataset.address = address.id;
  input.dataset.city = address.id;

  // Le champ devient une liste déroulante : la saisie reste libre, mais elle
  // est doublée de propositions dont la position est déjà connue.
  list.id = `suggest_${address.id}`;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");
  const suggest = attachSuggest(
    input,
    list,
    (picked) => {
      adopt(address.id, input, picked);
      advance(input);
    },
    config.complete,
  );
  suggests.set(address.id, suggest);

  input.addEventListener("blur", () => {
    void resolve(address.id, input);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    // Une proposition mise en avant l'emporte sur la frappe : c'est elle que
    // l'utilisateur regarde au moment où il valide.
    const picked = suggest.pickActive();
    if (picked) {
      adopt(address.id, input, picked);
      advance(input);
      return;
    }

    if (input.value.trim() === "") {
      if (wrapper.children.length > 1) removeRow(address.id);
      return;
    }
    void resolve(address.id, input).then(() => {
      advance(input);
    });
  });

  minus.addEventListener("click", () => {
    removeRow(address.id);
  });
  plus.addEventListener("click", () => {
    addRow(true);
  });

  wrapper.append(fragment);
  refreshButtons();
  if (focus) input.focus();
  return input;
}

/**
 * Passe à la ligne suivante : celle d'après si elle existe, une nouvelle
 * sinon. Valider la deuxième ligne d'une liste de trois ne doit pas ajouter
 * une quatrième ligne vide au bout.
 */
function advance(input: HTMLInputElement): void {
  const next = input
    .closest(".address")
    ?.nextElementSibling?.querySelector("input");
  if (next instanceof HTMLInputElement) next.focus();
  else addRow(true);
}

/**
 * Retient une proposition.
 *
 * Le service de complétion a déjà livré la position : il n'y a rien à
 * géocoder, et la ligne est résolue sans le moindre aller-retour.
 */
function adopt(id: string, input: HTMLInputElement, picked: Suggestion): void {
  input.value = picked.label;
  settle(id, input, picked.label, picked.coord);
}

/** Ajoute une ligne déjà remplie et la géocode (rechargement d'un permalien). */
export async function addRowWith(label: string): Promise<void> {
  const input = addRow();
  input.value = label;
  const id = input.dataset.city;
  if (id) await resolve(id, input);
}

function removeRow(id: string): void {
  document.getElementById(`address_${id}`)?.remove();
  suggests.get(id)?.destroy();
  suggests.delete(id);
  deleteAddress(id);
  resolved.delete(id);
  pending.delete(id);
  removePoint(id);
  refreshButtons();
  onChange();
}

/** Une seule ligne peut ajouter (la dernière) ; les autres peuvent se retirer. */
function refreshButtons(): void {
  const rows = [...wrapper.querySelectorAll<HTMLElement>(".address")];
  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    const plus = row.querySelector(".plus");
    const minus = row.querySelector(".minus");
    if (plus) show(plus, isLast);
    if (minus) show(minus, !isLast || rows.length > 1);
  });
}

async function resolve(id: string, input: HTMLInputElement): Promise<void> {
  const label = input.value.trim();
  const address = getAddress(id);
  if (!address) return;

  if (label === "") {
    address.label = "";
    address.coord = null;
    resolved.delete(id);
    removePoint(id);
    onChange();
    return;
  }
  if (resolved.get(id) === label) return;

  const running = pending.get(id);
  if (running?.label === label) return running.task;

  const task = locate(id, input, label);
  pending.set(id, { label, task });
  try {
    await task;
  } finally {
    if (pending.get(id)?.task === task) pending.delete(id);
  }
}

/** Inscrit une position trouvée, d'où qu'elle vienne : frappe libre ou liste. */
function settle(
  id: string,
  input: HTMLInputElement,
  label: string,
  coord: Coord,
): void {
  const address = getAddress(id);
  if (!address) return;

  resolved.set(id, label);
  address.label = label;
  address.coord = coord;
  input.removeAttribute("aria-invalid");
  input.removeAttribute("title");
  addPoint(id, coord, COLORS.address);
  onChange();
}

async function locate(
  id: string,
  input: HTMLInputElement,
  label: string,
): Promise<void> {
  const address = getAddress(id);
  if (!address) return;

  setPending(id, true);
  try {
    settle(id, input, label, await config.geocode(label));
  } catch (error) {
    resolved.delete(id);
    address.coord = null;
    removePoint(id);
    input.setAttribute("aria-invalid", "true");
    input.title = error instanceof Error ? error.message : config.notFound;
    onChange();
  } finally {
    setPending(id, false);
  }
}

function setPending(id: string, waiting: boolean): void {
  document
    .getElementById(`address_${id}`)
    ?.classList.toggle("pending", waiting);
}

/** Verrouille le formulaire pendant et après un calcul. */
export function lockRows(locked: boolean): void {
  // Un champ verrouillé ne se complète plus : la liste éventuellement ouverte
  // se referme avec lui.
  if (locked) for (const suggest of suggests.values()) suggest.close();
  for (const row of wrapper.querySelectorAll<HTMLElement>(".address")) {
    for (const button of row.querySelectorAll("button")) show(button, !locked);
    row.querySelector("input")?.toggleAttribute("readonly", locked);
  }
  if (!locked) refreshButtons();
}

export function clearRows(): void {
  for (const suggest of suggests.values()) suggest.destroy();
  suggests.clear();
  wrapper.replaceChildren();
  resolved.clear();
  pending.clear();
}

export function canCalculate(): boolean {
  return locatedAddresses().length > 1;
}
