import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // apps/web 用 jsdom（Next.js 官方推荐）；其余用 happy-dom（更轻量）
    environment: "happy-dom",
    environmentMatchGlobs: [["apps/web/**", "jsdom"]],
  },
});
