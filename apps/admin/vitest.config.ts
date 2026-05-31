import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "admin",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["../../vitest.setup.ts"],
  },
});
