# Pre-push Validation Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache successful pre-push validation by Git tree so dev/main branch switches do not repeat identical type checks and tests.

**Architecture:** A tracked Node script stores successful validation records under `git rev-parse --git-common-dir`, keyed by repository tree and runtime environment. Exact tree hits skip validation; cache misses run full type checking plus Vitest changed from the newest validated ancestor or current upstream, then record success only for a clean worktree.

**Tech Stack:** Node.js ESM, Git CLI, pnpm, Vitest 4.x, simple-git-hooks.

## Global Constraints

- Keep pre-commit and CI unchanged.
- Never update cache after failed validation or with a dirty worktree.
- Share cache across branches and linked worktrees through the Git common directory.
- Do not push to external remotes during integration verification.

---

### Task 1: Black-box cache behavior tests

**Files:**

- Create: `scripts/pre-push.test.mjs`

**Interfaces:**

- Consumes: `node scripts/pre-push.mjs` CLI.
- Produces: executable specifications for exact-tree hits, incremental baselines, failures, and dirty worktrees.

- [ ] Write tests that create temporary Git repositories and a fake `pnpm` executable.
- [ ] Verify the tests fail because `scripts/pre-push.mjs` does not exist.

### Task 2: Validation cache runner

**Files:**

- Create: `scripts/pre-push.mjs`

**Interfaces:**

- Consumes: Git repository state and `PRE_PUSH_NO_CACHE`.
- Produces: cache records in `<git-common-dir>/pre-push-cache-v1` and a process exit code.

- [ ] Implement environment-scoped cache lookup, newest validated ancestor selection, and upstream fallback.
- [ ] Run `pnpm exec vitest --run scripts/pre-push.test.mjs` and verify all tests pass.
- [ ] Refactor output and cache pruning while keeping tests green.

### Task 3: Hook integration and real push verification

**Files:**

- Modify: `package.json`
- Generated locally: `.git/hooks/pre-push`

**Interfaces:**

- Consumes: `node scripts/pre-push.mjs`.
- Produces: cached pre-push behavior installed by simple-git-hooks.

- [ ] Point `simple-git-hooks.pre-push` at the runner and reinstall hooks.
- [ ] Verify unit tests, type checking, and the installed hook command.
- [ ] In a temporary clone with a local bare remote, run dev push, fast-forward main push, then switch back to dev and push; verify only the first unique tree performs validation.
- [ ] Inspect final diff and confirm the real workspace remains on `dev` without external pushes.
