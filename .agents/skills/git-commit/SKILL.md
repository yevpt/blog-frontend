---
name: "git-commit"
description: "Use when writing or amending a git commit message in this repo. Provides the required Conventional-Commits-style format with a Chinese subject, the allowed type enum, scope rules, and body conventions. Trigger whenever you are about to run `git commit`, generate a commit message, or are asked to commit changes."
license: "MIT"
metadata:
  scope: "project"
---

# Git Commit 规范

由 `commit-msg` 钩子（`scripts/validate-commit-msg.cjs`）强制校验，不合规会被拒。请第一次就写对。

格式：`<type>(<scope>): <中文主题>`，可选正文（中文 bullet）与 footer。

- **type**（必填，小写）：`feat`(新功能) `fix`(修bug) `refactor`(重构) `perf`(性能) `test` `docs` `style`(纯格式) `build` `chore`(脚手架/依赖) `ci`
- **scope**（可选）：英文小写技术词，可含数字/连字符，如 `auth`、`comment-input`
- **主题**：冒号后留一空格；用中文、动词开头、≤50 字、结尾不加句号
- **破坏性变更**：footer 写 `BREAKING CHANGE: <描述>`（全大写+冒号）
- **禁止** `Co-authored-by:`、`Generated with`、🤖、Claude Code 等任何 AI 署名/生成标记

示例：

```
feat(auth): 新增邮箱验证码登录
fix(comment-replies): 修复折叠态缺少上边距
refactor(api): 收敛文章请求到类型化 client
```

常见错误：缺 type（`更新代码`）、主题非中文（`fix: lint errors`）、冒号后无空格、scope 含大写、超 50 字、结尾带句号。
