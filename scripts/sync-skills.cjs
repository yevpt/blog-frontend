#!/usr/bin/env node
/**
 * 同步 skill 符号链接：为 .agents/skills/ 下每个 skill 在 .claude/skills/ 建立
 * 相对符号链接（缺失才建，幂等）。新增 skill 后执行一次即可。
 * 由 `prepare`（pnpm install 时）自动触发，也可手动 `node scripts/sync-skills.cjs`。
 */
const fs = require("fs");
const path = require("path");

const SRC = ".agents/skills";
const DST = ".claude/skills";

if (!fs.existsSync(SRC)) process.exit(0);
fs.mkdirSync(DST, { recursive: true });

let created = 0;
for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const link = path.join(DST, entry.name);
  // 已存在（链接或目录）则跳过；lstat 不跟随链接，能识别已存在的（含失效）链接
  try {
    fs.lstatSync(link);
    continue;
  } catch {
    // 不存在，继续创建
  }
  fs.symlinkSync(path.join("..", "..", SRC, entry.name), link);
  console.log(`linked skill: ${entry.name}`);
  created++;
}
console.log(created ? `synced ${created} skill(s)` : "skills up to date");
