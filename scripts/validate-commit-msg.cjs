#!/usr/bin/env node
/**
 * Commit message 格式校验（与工具/AI 无关，git 层强制）。
 * 规范：<type>(<scope>): <中文主题>
 *   - type 限定枚举；scope 可选、英文小写技术词
 *   - 主题需含中文、≤50 字、不以句号结尾
 *   - 破坏性变更正文需包含 `BREAKING CHANGE:`（仅在出现该标记时校验其格式）
 * 由 .git/hooks/commit-msg 调用，参数为 commit message 文件路径。
 */
const fs = require("fs");

const TYPES = ["feat", "fix", "refactor", "test", "chore", "perf", "docs", "ci", "style", "build"];
const MAX_SUBJECT = 50;

const path = process.argv[2];
if (!path) {
  console.error("[commit-msg] 缺少 message 文件参数");
  process.exit(1);
}

const raw = fs.readFileSync(path, "utf8");
// 取首行作为主题；忽略注释行与空行
const subjectLine = raw.split("\n").find((l) => l.trim() && !l.startsWith("#"));

// 放行 merge / revert，git 自动生成无需约束
if (!subjectLine || /^(Merge|Revert)\b/.test(subjectLine)) {
  process.exit(0);
}

const errors = [];

// 格式：type(scope)?: 主题   —— 冒号后必须有空格
const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9-]+)\))?: (?<subject>.+)$/;
const m = subjectLine.match(HEADER);

if (!m) {
  errors.push("格式必须为 `<type>(<scope>): <中文主题>`（scope 可选，冒号后留一个空格）");
} else {
  const { type, scope, subject } = m.groups;

  if (!TYPES.includes(type)) {
    errors.push(`type 非法：「${type}」。仅允许 ${TYPES.join("/")}`);
  }
  if (scope && !/^[a-z0-9-]+$/.test(scope)) {
    errors.push(`scope「${scope}」须为英文小写技术词（可含数字与连字符）`);
  }
  if ([...subject].length > MAX_SUBJECT) {
    errors.push(`主题超长：${[...subject].length} 字，需 ≤ ${MAX_SUBJECT} 字`);
  }
  if (!/[一-龥]/.test(subject)) {
    errors.push("主题需使用中文描述");
  }
  if (/[。.]$/.test(subject)) {
    errors.push("主题结尾不要加句号");
  }
}

// 破坏性变更标记若出现，必须是 `BREAKING CHANGE:` 全大写带冒号
if (/breaking change/i.test(raw) && !/BREAKING CHANGE:/.test(raw)) {
  errors.push("破坏性变更标记须为 `BREAKING CHANGE: <描述>`（全大写 + 冒号）");
}

// 禁止 AI 署名 / 自动生成标记
if (/^Co-authored-by:/im.test(raw)) {
  errors.push("禁止添加 `Co-authored-by:` 署名");
}
if (
  /generated with|🤖|claude code|noreply@anthropic|by \[?(claude|codex|cursor|copilot)/i.test(raw)
) {
  errors.push("禁止添加 AI 生成标记 / 工具署名（如 Generated with、🤖、Claude Code 等）");
}

if (errors.length) {
  console.error("\n✗ Commit message 不符合规范：\n");
  errors.forEach((e) => console.error("  - " + e));
  console.error("\n  示例：feat(auth): 新增邮箱验证码登录\n");
  console.error("  规范详见 .agents/skills/git-commit/SKILL.md\n");
  process.exit(1);
}
process.exit(0);
