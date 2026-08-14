/** Récupère un élément par id, ou échoue explicitement si le HTML a divergé. */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Élément #${id} absent du document`);
  return found as T;
}

export function show(element: Element, visible: boolean): void {
  element.classList.toggle("hide", !visible);
}
