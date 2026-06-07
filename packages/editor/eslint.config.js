import { react } from "@repo/eslint-config/react";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...react,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
  },
  { ignores: ["node_modules/**"] },
];
