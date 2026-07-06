export default {
  // 只对暂存的代码文件跑 eslint --fix，再统一 prettier 格式化，
  // 避免每次 commit 全量 lint。--max-warnings 0 与 CI 保持一致。
  "**/*.{ts,tsx,js,mjs,cjs}": [
    "eslint --fix --max-warnings 0 --no-warn-ignored",
    "prettier --write",
  ],
  "**/*.json": ["prettier --write"],
  "**/*.css": ["prettier --write"],
};
