import { next } from "@repo/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...next,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-undef": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**"] },
];
