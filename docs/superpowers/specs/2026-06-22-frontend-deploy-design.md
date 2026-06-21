# Frontend Deploy Design

## Goal

为前端仓库增加 GitHub Actions 自动部署：`apps/web` 以 Docker 镜像和 Docker Compose 部署，`apps/admin` 以静态构建产物上传到远端服务器目录，由外部 nginx 访问。

## Scope

- `main`、`dev` 推送和手动触发会部署。
- PR 只做测试、类型检查和 lint，不部署。
- 远端根目录通过 GitHub Actions 变量 `DEPLOY_ROOT` 配置，默认 `/root/docker/blog-frontend`。
- `web` 部署到 `$DEPLOY_ROOT/web`，保留服务器上的 `.env`。
- `admin` 部署到 `$DEPLOY_ROOT/admin`，上传并解压静态包。

## Architecture

`web` 使用多阶段 Dockerfile 构建 Next standalone 产物，运行时通过 Docker Compose 注入 `API_BASE_URL`、`BLOG_USER_ID` 等环境变量。Action 推送镜像后，在远端写入 `.deploy.env` 指向本次镜像 tag，再执行 `docker compose pull/up`。

`admin` 使用 Vite build 生成 `apps/admin/dist`，Action 压缩后通过 `scp` 上传到服务器，远端原子替换静态文件目录。admin 默认调用同源 `/api`，由服务器 nginx 反向代理到后端；`VITE_API_BASE_URL` 仅作为可选覆盖。

## Testing

- 为 admin API base 默认值增加 Vitest 覆盖。
- 运行 admin 单测确认默认 `/api` 生效。
- 运行 `pnpm check-types`、`pnpm lint`。
- 本地执行 web Docker build 验证容器构建链路。
