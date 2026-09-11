import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/** Chemin absolu d'un fichier du dépôt : Rolldown n'accepte pas de relatif ici. */
const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "docs",
    rollupOptions: {
      /* Deux pages : la France à la racine, le monde dans `/world/`. */
      input: {
        main: page("index.html"),
        world: page("world/index.html"),
      },
    },
  },
});
