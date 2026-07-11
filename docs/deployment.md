# 部署

两个应用采用不同的交付形态：**web 前台走容器化**，**admin 后台是静态文件**。

## CI/CD 流程（GitHub Actions）

### `ci.yml` —— 质量门槛

push / PR 到 `main`、`dev` 时安装依赖并跑测试、类型检查、lint，作为合并前的质量门槛。

### `deploy.yml` —— 构建与部署

push 到 `main` / `dev`（或手动 `workflow_dispatch`）触发，分三个 job：

1. **web-image**：用 [`docker/web/Dockerfile`](../docker/web/Dockerfile) 多阶段构建 Next.js standalone 镜像，推送到容器镜像仓库，打 `latest` 与 `<commit-sha>` 两个 tag。
2. **admin-artifact**：`pnpm --filter admin build`，把 `apps/admin/dist` 打包成 GitHub Artifact。
3. **deploy**：依赖前两个 job，按分支区分 `production`（`main`）/ `staging`（`dev`）Environment，通过 SSH 把 `docker-compose.yml` 与 admin 静态包同步到服务器，远端执行 `docker compose pull/up` 更新 web 容器、原子替换 admin 静态目录。

## 自托管部署

Fork 本项目自行部署时需准备：

### Web（容器化）

服务器装好 Docker，在部署目录创建 `.env`（字段见下），再用 [`docker/web/docker-compose.yml`](../docker/web/docker-compose.yml) 启动。镜像地址通过 `BLOG_WEB_IMAGE` 环境变量注入，**不需要手改 compose 文件**。

### Admin（静态文件）

`pnpm --filter admin build` 产出 `apps/admin/dist`，交给任意静态文件服务器（如 Nginx）托管即可。本仓库不含反代配置。

## Web 环境变量

字段参考 [`apps/web/.env.example`](../apps/web/.env.example)：

| 变量 | 用途 |
|---|---|
| `API_BASE_URL` | Go 后端基础 URL（服务端使用，不暴露给浏览器） |
| `BLOG_USER_ID` | 博主用户 ID，用于过滤碎语接口 |
| `ANALYTICS_COLLECT_TOKEN_SECRET` | 埋点 collect token 签名密钥（仅 SSR 使用）。**必须与后端 `BLOG_ANALYTICS_COLLECT_TOKEN_SECRET` 完全一致**；留空则开发模式放行 |
| `ANALYTICS_COLLECT_TOKEN_TTL_MS` | collect token 有效期（毫秒），默认 `300000`（5 分钟），应与后端保持一致 |

> ⚠️ SSR 服务器与后端之间的时钟偏移可能导致有效 token 被拒（SSR 时钟超前时），两端均应启用 NTP 校时。

## CI 所需的 GitHub Secrets / Variables

| 类型 | 变量 | 用途 |
|---|---|---|
| Secret | `REGISTRY_PASSWORD` | 镜像仓库登录密码 / Token |
| Secret | `REMOTE_HOST` / `REMOTE_USER` / `SSH_PRIVATE_KEY` | SSH 登录部署服务器 |
| Variable | `REGISTRY_HOST` / `REGISTRY_USERNAME` / `REGISTRY_NAMESPACE` | 镜像仓库地址与命名空间 |
| Variable | `DEPLOY_WEB_ROOT` / `DEPLOY_ADMIN_ROOT` | 服务器上 web / admin 的部署目录 |
| Variable | `REMOTE_PORT`（可选，默认 22） | SSH 端口 |
