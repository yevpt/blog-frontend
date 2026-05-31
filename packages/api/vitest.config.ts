import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "happy-dom",
    globals: true,
  },
});
