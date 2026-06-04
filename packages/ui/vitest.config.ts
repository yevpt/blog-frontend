import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "client-only": path.resolve(__dirname, "src/__mocks__/client-only.ts"),
    },
  },
  test: {
    name: "ui",
    environment: "happy-dom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "../../vitest.setup.ts")],
  },
});
