import { react } from "@repo/eslint-config/react";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...react,
  {
    // Tiptap/ProseMirror 复杂类型会触发 no-undef 误报，由 tsc 负责类型检查
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
    rules: { "no-undef": "off" },
  },
  { ignores: ["node_modules/**"] },
];
