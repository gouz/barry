/** Récupère un élément par id, ou échoue explicitement si le HTML a divergé. */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Élément #${id} absent du document`);
  return found as T;
}

export function show(element: Element, visible: boolean): void {
  element.classList.toggle("hide", !visible);
}

/**
 * Comme {@link el}, mais pour un élément que toutes les pages n'ont pas.
 *
 * La page monde se passe de deux interrupteurs qu'OSRM ne sait pas honorer :
 * leur absence est attendue, et ne doit pas faire échouer le câblage.
 */
export function maybe<T extends HTMLElement = HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T | null;
}
