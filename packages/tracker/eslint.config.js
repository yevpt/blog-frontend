import { base } from "@repo/eslint-config/base";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
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
