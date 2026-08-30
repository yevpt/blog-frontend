import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import { base } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export const react = [
  ...base,
  {
    files: ["**/*.tsx", "**/*.jsx"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11y,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      // v7 的 recommended 会额外启用 React Compiler 规则；升级依赖时保持既有 lint 策略。
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];
