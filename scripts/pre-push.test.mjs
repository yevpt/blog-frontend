import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "pre-push.mjs");
const temporaryRoots = [];

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Pre-push Test",
      GIT_AUTHOR_EMAIL: "pre-push@example.com",
      GIT_COMMITTER_NAME: "Pre-push Test",
      GIT_COMMITTER_EMAIL: "pre-push@example.com",
    },
  }).trim();
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), "pre-push-cache-"));
  temporaryRoots.push(root);
  git(root, "init", "-b", "dev");
  writeFileSync(join(root, "README.md"), "initial\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "initial");

  const binDir = join(root, ".git", "pre-push-test-bin");
  const commandLog = join(root, ".git", "pnpm.log");
  mkdirSync(binDir);
  writeFileSync(
    join(binDir, "pnpm"),
    `#!/bin/sh
printf '%s\\n' "$*" >> "$PRE_PUSH_COMMAND_LOG"
if [ "$1" = "--version" ]; then
  printf '11.2.2\\n'
  exit 0
fi
if [ "$PRE_PUSH_FAIL" = "check-types" ] && [ "$*" = "run check-types" ]; then
  exit 17
fi
if [ -n "$PRE_PUSH_MUTATE_FILE" ] && [ "$*" = "run check-types" ]; then
  printf 'generated\\n' > "$PRE_PUSH_MUTATE_FILE"
fi
if [ "$PRE_PUSH_FAIL" = "tests" ]; then
  if [ "$1 $2" = "exec vitest" ] || [ "$*" = "run test:run" ]; then
    exit 18
  fi
fi
exit 0
`,
    { mode: 0o755 },
  );

  return { root, binDir, commandLog };
}

function runHook(repository, extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: repository.root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${repository.binDir}:${process.env.PATH}`,
      PRE_PUSH_COMMAND_LOG: repository.commandLog,
    },
  });
}

function validationCommands(repository) {
  return readFileSync(repository.commandLog, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line !== "--version");
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("pre-push validation cache", () => {
  it("在不同分支指向相同 tree 时复用验证结果", () => {
    const repository = createRepository();

    const first = runHook(repository);
    git(repository.root, "switch", "-c", "main");
    const second = runHook(repository);

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(validationCommands(repository)).toEqual(["run check-types", "run test:run"]);
    expect(second.stdout).toContain("命中验证缓存");
  });

  it("新提交只测试上次成功提交之后的影响范围", () => {
    const repository = createRepository();
    expect(runHook(repository).status).toBe(0);
    const validatedCommit = git(repository.root, "rev-parse", "HEAD");
    writeFileSync(join(repository.root, "feature.ts"), "export const feature = true;\n");
    git(repository.root, "add", "feature.ts");
    git(repository.root, "commit", "-m", "feature");

    const result = runHook(repository);

    expect(result.status).toBe(0);
    expect(validationCommands(repository).slice(-2)).toEqual([
      "run check-types",
      `exec vitest --run --changed ${validatedCommit} --passWithNoTests`,
    ]);
  });

  it("测试失败时不记录缓存", () => {
    const repository = createRepository();

    const failed = runHook(repository, { PRE_PUSH_FAIL: "tests" });
    const retried = runHook(repository);

    expect(failed.status).toBe(18);
    expect(retried.status).toBe(0);
    expect(
      validationCommands(repository).filter((line) => line === "run check-types"),
    ).toHaveLength(2);
  });

  it("恢复类型检查生成的 next-env 差异后记录缓存", () => {
    const repository = createRepository();
    const nextEnv = join(repository.root, "apps", "web", "next-env.d.ts");
    mkdirSync(dirname(nextEnv), { recursive: true });
    writeFileSync(nextEnv, "original\n");
    git(repository.root, "add", "apps/web/next-env.d.ts");
    git(repository.root, "commit", "-m", "next env");

    const first = runHook(repository, { PRE_PUSH_MUTATE_FILE: nextEnv });
    const second = runHook(repository, { PRE_PUSH_MUTATE_FILE: nextEnv });

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(readFileSync(nextEnv, "utf8")).toBe("original\n");
    expect(
      validationCommands(repository).filter((line) => line === "run check-types"),
    ).toHaveLength(1);
  });

  it("工作区脏时不读取或更新缓存", () => {
    const repository = createRepository();
    expect(runHook(repository).status).toBe(0);
    writeFileSync(join(repository.root, "feature.ts"), "export const feature = true;\n");
    git(repository.root, "add", "feature.ts");
    git(repository.root, "commit", "-m", "feature");
    writeFileSync(join(repository.root, "feature.ts"), "export const feature = false;\n");

    const dirty = runHook(repository);
    git(repository.root, "restore", "feature.ts");
    const clean = runHook(repository);

    expect(dirty.status).toBe(0);
    expect(dirty.stdout).toContain("工作区有未提交改动");
    expect(clean.status).toBe(0);
    expect(
      validationCommands(repository).filter((line) => line === "run check-types"),
    ).toHaveLength(3);
  });
});
