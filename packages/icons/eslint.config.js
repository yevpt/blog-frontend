import { react } from "@repo/eslint-config/react";

/** @type {import("eslint").Linter.Config[]} */
// scripts/ 是 Node.js 构建脚本，不属于应用代码，跳过 React lint 规则
export default [...react, { ignores: ["node_modules/**", "scripts/**"] }];
