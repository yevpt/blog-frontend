export default {
  "**/*.{ts,tsx}": ["eslint --fix --no-error-on-unmatched-pattern", "prettier --write"],
  "**/*.{js,mjs,cjs}": ["prettier --write"],
  "**/*.json": ["prettier --write"],
  "**/*.css": ["prettier --write"],
};
