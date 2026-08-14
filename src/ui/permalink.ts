import type { CalcMode } from "../types.ts";

export interface Permalink {
  readonly mode: CalcMode;
  readonly addresses: readonly string[];
}

/**
 * Encode l'état partageable dans le fragment d'URL.
 *
 * On conserve `btoa` brut tant que c'est possible : c'est le format des liens
 * déjà partagés. Les caractères hors Latin-1 le font échouer — on bascule
 * alors sur un encodage UTF-8 signalé par un `~` initial.
 */
export function encodePermalink(
  mode: CalcMode,
  addresses: readonly string[],
): string {
  const raw = [mode, ...addresses].join("|");
  try {
    return btoa(raw);
  } catch {
    const bytes = new TextEncoder().encode(raw);
    return `~${btoa(String.fromCharCode(...bytes))}`;
  }
}

export function decodePermalink(hash: string): Permalink | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (value === "") return null;

  let raw: string;
  try {
    if (value.startsWith("~")) {
      const bytes = Uint8Array.from(atob(value.slice(1)), (char) =>
        char.charCodeAt(0),
      );
      raw = new TextDecoder().decode(bytes);
    } else {
      raw = atob(value);
    }
  } catch {
    return null;
  }

  const [mode, ...addresses] = raw.split("|");
  if (addresses.length === 0) return null;
  return { mode: mode === "distance" ? "distance" : "time", addresses };
}
