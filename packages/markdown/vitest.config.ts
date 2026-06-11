import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "markdown",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/vitest.setup.ts"],
  },
});
