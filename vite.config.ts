import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playgroundPlugin } from "./src/vite-playground-plugin";

// VectorUI is a client-only SPA prototype. A tiny hash router (src/router.tsx)
// gives one route per demo without pulling in react-router.
//
// `base` is conditional: dev keeps its root at `/` (so localhost:5181 just
// works); production builds emit assets under `/VectorUI/` for GitHub Pages,
// which serves the site at https://samlee-dedeboy.github.io/VectorUI/.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/VectorUI/" : "/",
  plugins: [react(), playgroundPlugin()],
  server: { port: 5181, strictPort: true },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
}));
