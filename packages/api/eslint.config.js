import { base } from "@repo/eslint-config/base";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    // packages/api 运行于浏览器/Node 双环境，TypeScript 本身已负责类型检查，
    // 关闭 no-undef 避免 DOM 类型（RequestInit、fetch 等）误报
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "no-undef": "off",
    },
  },
  { ignores: ["node_modules/**"] },
];
