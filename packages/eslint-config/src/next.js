import { react } from "./react.js";

/** @type {import("eslint").Linter.Config[]} */
export const next = [
  ...react,
  {
    rules: {
      "no-console": "off", // Server components log to stdout legitimately
    },
  },
];
