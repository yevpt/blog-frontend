# e2e 测试

基于 Playwright，覆盖 web 登录与 admin 核心模块只读冒烟。**仅本地/手动运行，不接 CI。**

## 前置

1. 准备后端。两选一：
   - **测试环境**：把 `E2E_BACKEND_API` 指向可用的测试环境 URL。
   - **本地后端**（`../../../blog-backend`）：配置好 MySQL/Redis 后
     ```bash
     make dbsetup   # 幂等：跑迁移 + seed 默认管理员（默认密码 admin）
     make run       # 或 make dev
     ```
2. 准备环境变量：
   ```bash
   cp .env.example .env   # 填后端地址与账号
   ```
3. 安装浏览器（首次）：
   ```bash
   pnpm --filter e2e exec playwright install chromium
   ```

## 运行

```bash
pnpm --filter e2e test:e2e          # 跑全部
pnpm --filter e2e test:e2e:ui       # UI 模式
pnpm --filter e2e test:e2e -- --project=web    # 只跑 web
pnpm --filter e2e test:e2e -- --project=admin  # 只跑 admin
```

Playwright 会自动构建/启动 web（3000）与 admin（5173），无需手动起前端。

## 约定

- 第一期只做只读断言，不写数据（不污染共享后端）。
- 真实账号只写在本地 `.env`（已 gitignore），仓库只提交 `.env.example`。
- 测试文件用 `*.spec.ts` / `*.setup.ts`，与 vitest 的 `*.test.ts` 区分；根 `vitest.config.ts` 已排除本目录。
