# Frontend Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automated deployment for `apps/web` and `apps/admin`.

**Architecture:** Build `apps/web` into a Docker image and deploy it with Docker Compose. Build `apps/admin` into static files and upload the archive to the remote server for nginx to serve.

**Tech Stack:** GitHub Actions, Docker Buildx, Docker Compose, Next standalone, Vite, pnpm.

---

### Task 1: Admin API Default

**Files:**
- Create: `apps/admin/src/lib/api-base-url.ts`
- Create: `apps/admin/src/lib/api-base-url.test.ts`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] Write a failing test that expects an empty env value to resolve to `/api`.
- [ ] Run `pnpm --filter admin test src/lib/api-base-url.test.ts` and verify the test fails.
- [ ] Add `resolveApiBaseUrl(value: string | undefined): string` returning `value || "/api"`.
- [ ] Wire `api.ts` to call `resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)`.
- [ ] Re-run `pnpm --filter admin test src/lib/api-base-url.test.ts`.

### Task 2: Web Container

**Files:**
- Create: `.dockerignore`
- Create: `docker/web/Dockerfile`
- Create: `docker/web/docker-compose.yml`
- Modify: `apps/web/next.config.mjs`

- [ ] Enable Next standalone output.
- [ ] Add a Dockerfile that installs pnpm, builds `web`, and copies `.next/standalone`, `.next/static`, and `public` into a minimal runtime image.
- [ ] Add compose service `blog-web` with `BLOG_WEB_IMAGE`, runtime env vars, port mapping, restart policy, and log rotation.
- [ ] Run `docker build -f docker/web/Dockerfile .` to verify the image builds.

### Task 3: GitHub Actions Deploy

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] Add test job matching existing CI checks.
- [ ] Add `web-image` job that builds and pushes `${{ vars.REGISTRY_NAMESPACE }}/blog-frontend-web:latest` and `:${{ github.sha }}`.
- [ ] Add `admin-artifact` job that builds admin and uploads `admin-dist.tar.gz`.
- [ ] Add deploy job that prepares SSH, syncs web compose, deploys the web container, uploads and extracts the admin static archive.
- [ ] Validate workflow YAML syntax with a parser.

### Task 4: Verification

**Files:**
- All changed files.

- [ ] Run `pnpm --filter admin test src/lib/api-base-url.test.ts`.
- [ ] Run `pnpm check-types`.
- [ ] Run `pnpm lint`.
- [ ] Review `git diff --check`.
