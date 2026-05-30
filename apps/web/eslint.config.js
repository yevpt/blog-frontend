import { next } from "@repo/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
export default [...next, { ignores: [".next/**", "node_modules/**"] }];
