import type { Settings } from "../state.ts";
import type { CalcMode, Transport } from "../types.ts";

export interface Permalink extends Settings {
  readonly addresses: readonly string[];
}

/**
 * Le premier segment porte tous les réglages, séparés par des virgules.
 *
 * Les liens de la première version ne contenaient là que le mode
 * (`time` ou `distance`) : un segment sans virgule est donc reconnu comme
 * ancien et complété par les valeurs par défaut. Les liens déjà partagés
 * restent ainsi lisibles, et le format peut encore s'étendre par la droite.
 */
function encodeSettings({ mode, transport, avoidMotorways }: Settings): string {
  return [mode, transport, avoidMotorways ? "1" : "0"].join(",");
}

function decodeSettings(segment: string): Settings {
  const [mode, transport, avoidMotorways] = segment.split(",");
  return {
    mode: mode === "distance" ? "distance" : ("time" satisfies CalcMode),
    transport:
      transport === "pedestrian" ? "pedestrian" : ("car" satisfies Transport),
    avoidMotorways: avoidMotorways === "1",
  };
}

/**
 * Encode l'état partageable dans le fragment d'URL.
 *
 * On conserve `btoa` brut tant que c'est possible : c'est le format des liens
 * déjà partagés. Les caractères hors Latin-1 le font échouer — on bascule
 * alors sur un encodage UTF-8 signalé par un `~` initial.
 */
export function encodePermalink(
  settings: Settings,
  addresses: readonly string[],
): string {
  const raw = [encodeSettings(settings), ...addresses].join("|");
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

  const [settings, ...addresses] = raw.split("|");
  if (settings === undefined || addresses.length === 0) return null;
  return { ...decodeSettings(settings), addresses };
}
