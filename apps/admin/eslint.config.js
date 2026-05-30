import { react } from "@repo/eslint-config/react";

/** @type {import("eslint").Linter.Config[]} */
export default [...react, { ignores: ["dist/**", "node_modules/**"] }];
