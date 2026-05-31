import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "ui",
    environment: "happy-dom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "../../vitest.setup.ts")],
  },
});
