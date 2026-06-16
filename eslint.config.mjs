import { base } from "@repo/eslint-config/base";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    // Node CommonJS 脚本（git hooks 等），提供 process/console 等全局
    files: ["scripts/**/*.cjs", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
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
