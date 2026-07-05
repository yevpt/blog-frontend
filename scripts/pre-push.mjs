import { execFileSync, spawnSync } from "node:child_process";
import console from "node:console";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const CACHE_DIRECTORY_NAME = "pre-push-cache-v1";
const MAX_CACHE_RECORDS = 64;
const NEXT_ENV_PATH = resolve("apps/web/next-env.d.ts");

function capture(command, args, allowFailure = false) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function git(args, allowFailure = false) {
  return capture("git", args, allowFailure);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  return result.status ?? 1;
}

function isWorktreeClean() {
  return git(["status", "--porcelain", "--untracked-files=normal"]) === "";
}

function getEnvironmentKey() {
  const pnpmVersion = capture("pnpm", ["--version"]);
  return createHash("sha256")
    .update(
      JSON.stringify({
        schema: 1,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pnpm: pnpmVersion,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

function readCacheRecords(cacheDirectory) {
  if (!existsSync(cacheDirectory)) return [];

  return readdirSync(cacheDirectory)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      const path = resolve(cacheDirectory, name);
      try {
        const record = JSON.parse(readFileSync(path, "utf8"));
        if (typeof record.commit !== "string" || typeof record.tree !== "string") return [];
        return [{ ...record, path, modifiedAt: statSync(path).mtimeMs }];
      } catch {
        return [];
      }
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
}

function findValidatedAncestor(records) {
  for (const record of records) {
    const result = spawnSync("git", ["merge-base", "--is-ancestor", record.commit, "HEAD"], {
      stdio: "ignore",
    });
    if (result.status === 0) return record.commit;
  }
  return null;
}

function findFallbackBaseline() {
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], true);
  if (upstream) return upstream;

  const originMain = git(["rev-parse", "--verify", "--quiet", "origin/main"], true);
  if (originMain) return "origin/main";

  const parent = git(["rev-parse", "--verify", "--quiet", "HEAD^"], true);
  return parent ? "HEAD^" : null;
}

function writeCacheRecord(cacheDirectory, head, tree) {
  mkdirSync(cacheDirectory, { recursive: true });
  const destination = resolve(cacheDirectory, `${tree}.json`);
  const temporary = `${destination}.${process.pid}.tmp`;
  writeFileSync(
    temporary,
    `${JSON.stringify({ commit: head, tree, validatedAt: new Date().toISOString() })}\n`,
  );
  renameSync(temporary, destination);

  const records = readCacheRecords(cacheDirectory);
  for (const record of records.slice(MAX_CACHE_RECORDS)) rmSync(record.path, { force: true });
}

function main() {
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const commonDirectory = resolve(git(["rev-parse", "--git-common-dir"]));
  const cacheDirectory = resolve(commonDirectory, CACHE_DIRECTORY_NAME, getEnvironmentKey());
  const cacheDisabled = process.env.PRE_PUSH_NO_CACHE === "1";
  const cleanAtStart = isWorktreeClean();
  const records = cacheDisabled || !cleanAtStart ? [] : readCacheRecords(cacheDirectory);

  if (!cleanAtStart) {
    console.log("[pre-push] 工作区有未提交改动，本次不读取或更新验证缓存。");
  } else if (cacheDisabled) {
    console.log("[pre-push] PRE_PUSH_NO_CACHE=1，本次强制重新验证。");
  } else if (records.some((record) => record.tree === tree)) {
    console.log(`[pre-push] 命中验证缓存 ${tree.slice(0, 12)}，跳过类型检查和测试。`);
    return 0;
  }

  const baseline = findValidatedAncestor(records) ?? findFallbackBaseline();
  const nextEnvSnapshot =
    cleanAtStart && existsSync(NEXT_ENV_PATH) ? readFileSync(NEXT_ENV_PATH) : null;
  try {
    console.log("[pre-push] 运行全量类型检查。");
    const typecheckStatus = run("pnpm", ["run", "check-types"]);
    if (typecheckStatus !== 0) return typecheckStatus;

    const testArgs = baseline
      ? ["exec", "vitest", "--run", "--changed", baseline, "--passWithNoTests"]
      : ["run", "test:run"];
    console.log(
      baseline
        ? `[pre-push] 运行自 ${baseline} 以来受影响的测试。`
        : "[pre-push] 未找到可靠基线，运行全量测试。",
    );
    const testStatus = run("pnpm", testArgs);
    if (testStatus !== 0) return testStatus;
  } finally {
    // Next typegen 会改写该已跟踪文件；恢复原内容，避免 push 后工作区变脏并使缓存失效。
    if (nextEnvSnapshot) writeFileSync(NEXT_ENV_PATH, nextEnvSnapshot);
  }

  if (!cacheDisabled && cleanAtStart && isWorktreeClean()) {
    writeCacheRecord(cacheDirectory, head, tree);
    console.log(`[pre-push] 已缓存验证结果 ${tree.slice(0, 12)}。`);
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[pre-push] 执行失败：${message}`);
  process.exitCode = 1;
}
