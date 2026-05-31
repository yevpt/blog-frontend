import { react } from "@repo/eslint-config/react";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...react,
  {
    // admin 是纯浏览器 SPA，所有 .ts 文件也需要 browser globals（如 localStorage、window）
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.browser } },
  },
  { ignores: ["dist/**", "node_modules/**"] },
];
