import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// VectorUI is a client-only SPA prototype. A tiny hash router (src/router.tsx)
// gives one route per demo without pulling in react-router.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, strictPort: true },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
