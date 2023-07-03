import { defineConfig } from "vite";
import pugPlugin from "vite-plugin-pug";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [pugPlugin()],
  build: {
    outDir: "docs",
  },
});