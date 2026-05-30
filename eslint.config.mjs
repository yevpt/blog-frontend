import { base } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    ignores: [
      "node_modules/**",
      "apps/**", // each app has its own config
      "packages/**", // each package has its own config
      ".next/**",
      "dist/**",
    ],
  },
];
