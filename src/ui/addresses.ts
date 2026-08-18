import { geocode } from "../api/geocode.ts";
import { COLORS } from "../config.ts";
import { addPoint, removePoint } from "../map/map.ts";
import {
  createAddress,
  deleteAddress,
  getAddress,
  locatedAddresses,
} from "../state.ts";
import { el, show } from "./dom.ts";

let wrapper: HTMLElement;
let template: HTMLTemplateElement;
let onChange: () => void;

/** Dernier libellé effectivement géocodé, pour ne pas rejouer la requête à chaque blur. */
const resolved = new Map<string, string>();

const pending = new Map<string, { label: string; task: Promise<void> }>();

export function initAddresses(notifyChange: () => void): void {
  wrapper = el("addresses-wrapper");
  template = el<HTMLTemplateElement>("address-template");
  onChange = notifyChange;
}

export function addRow(focus = false): HTMLInputElement {
  const address = createAddress();
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const row = fragment.querySelector<HTMLElement>(".address");
  const input = fragment.querySelector<HTMLInputElement>("input");
  const minus = fragment.querySelector<HTMLButtonElement>(".minus");
  const plus = fragment.querySelector<HTMLButtonElement>(".plus");
  if (!row || !input || !minus || !plus)
    throw new Error("Gabarit d'adresse incomplet");

  row.id = `address_${address.id}`;
  row.dataset.address = address.id;
  input.dataset.city = address.id;

  input.addEventListener("blur", () => {
    void resolve(address.id, input);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (input.value.trim() === "") {
      if (wrapper.children.length > 1) removeRow(address.id);
      return;
    }
    void resolve(address.id, input).then(() => {
      addRow(true);
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

/** Ajoute une ligne déjà remplie et la géocode (rechargement d'un permalien). */
export async function addRowWith(label: string): Promise<void> {
  const input = addRow();
  input.value = label;
  const id = input.dataset.city;
  if (id) await resolve(id, input);
}

function removeRow(id: string): void {
  document.getElementById(`address_${id}`)?.remove();
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

async function locate(
  id: string,
  input: HTMLInputElement,
  label: string,
): Promise<void> {
  const address = getAddress(id);
  if (!address) return;

  setPending(id, true);
  try {
    const coord = await geocode(label);
    resolved.set(id, label);
    address.label = label;
    address.coord = coord;
    input.removeAttribute("aria-invalid");
    input.removeAttribute("title");
    addPoint(id, coord, COLORS.address);
  } catch (error) {
    resolved.delete(id);
    address.coord = null;
    removePoint(id);
    input.setAttribute("aria-invalid", "true");
    input.title =
      error instanceof Error ? error.message : "Adresse introuvable";
  } finally {
    setPending(id, false);
  }
  onChange();
}

function setPending(id: string, waiting: boolean): void {
  document
    .getElementById(`address_${id}`)
    ?.classList.toggle("pending", waiting);
}

/** Verrouille le formulaire pendant et après un calcul. */
export function lockRows(locked: boolean): void {
  for (const row of wrapper.querySelectorAll<HTMLElement>(".address")) {
    for (const button of row.querySelectorAll("button")) show(button, !locked);
    row.querySelector("input")?.toggleAttribute("readonly", locked);
  }
  if (!locked) refreshButtons();
}

export function clearRows(): void {
  wrapper.replaceChildren();
  resolved.clear();
  pending.clear();
}

export function canCalculate(): boolean {
  return locatedAddresses().length > 1;
}
