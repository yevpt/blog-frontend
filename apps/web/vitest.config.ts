import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    name: "web",
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "../../vitest.setup.ts")],
  },
});
