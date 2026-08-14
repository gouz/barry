import type { CalcMode, Coord, Transport } from "./types.ts";

/** Une ligne du formulaire d'adresses. */
export interface Address {
  readonly id: string;
  /** Texte saisi par l'utilisateur. */
  label: string;
  /** Coordonnées résolues, `null` tant que le géocodage n'a pas abouti. */
  coord: Coord | null;
}

/** Paramètres de calcul, pilotés par les interrupteurs de la barre latérale. */
export const settings = {
  mode: "time" as CalcMode,
  transport: "car" as Transport,
  avoidMotorways: false,
};

const addresses = new Map<string, Address>();
let nextId = 0;

export function createAddress(): Address {
  const address: Address = { id: `place_${nextId++}`, label: "", coord: null };
  addresses.set(address.id, address);
  return address;
}

export function getAddress(id: string): Address | undefined {
  return addresses.get(id);
}

export function deleteAddress(id: string): void {
  addresses.delete(id);
}

export function allAddresses(): Address[] {
  return [...addresses.values()];
}

/** Adresses effectivement géocodées, seules utilisables pour un calcul. */
export function locatedAddresses(): (Address & { coord: Coord })[] {
  return allAddresses().filter(
    (a): a is Address & { coord: Coord } => a.coord !== null,
  );
}

export function resetAddresses(): void {
  addresses.clear();
  nextId = 0;
}
