import { react } from "@repo/eslint-config/react";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...react,
  {
    // UI 库中的 .ts Hook 文件运行在浏览器环境，需要 browser globals
    // no-undef 对 TypeScript 类型（ResizeObserverBoxOptions 等）误报，由 tsc 负责类型检查
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.browser } },
    rules: { "no-undef": "off" },
  },
  { ignores: ["node_modules/**"] },
];
