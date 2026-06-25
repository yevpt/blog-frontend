import { react } from "@repo/eslint-config/react";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...react,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "no-undef": "off",
    },
  },
  { ignores: ["node_modules/**"] },
];
