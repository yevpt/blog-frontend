# 重构任务清单（交付给执行 AI）

> 目标：消除架构 / 目录 / 代码风格债务。每个任务独立可验证，按 P0 → P2 顺序执行。
> 约束：遵守仓库 `AGENTS.md`；改动 Hook/组件/页面必须同步增改测试；不得引入 `any`、第三方图标库、内联 `<svg>`。
> 每完成一个任务用一个独立 commit，message 遵循 `<type>(<scope>): <中文主题>`。

---

## P0 仓库卫生（先做，零风险）

### T1. 移出已提交的环境文件，改用 example 范式
- `git rm --cached apps/web/.env apps/admin/.env`
- 新建 `apps/web/.env.example`、`apps/admin/.env.example`，保留 key 与注释、清空值。
- `.gitignore` 已忽略 `.env.*local`，追加一行 `.env`（保留 `!.env.example`）。
- **验收**：`git ls-files | grep -E '\.env$'` 无输出；`.env.example` 已入库；本地 `.env` 仍存在且未被跟踪。

### T2. 删除调试 / 临时文件
- 删除根目录 `test-markdown.ts`、`test-markdown2.ts`。
- 删除 `apps/web/app/debug-editor-tmp/`（整个目录）。
- 全局搜索确认无引用：`grep -rn "debug-editor-tmp\|test-markdown" apps packages --include="*.ts*" | grep -v node_modules`。
- **验收**：上述路径不存在；`pnpm run check-types` 通过。

### T3. 统一规则文件来源，消除漂移
- 各级 `.cursorrules`（根 / `apps/web` / `apps/admin` / `packages/ui`）内容与同级 `AGENTS.md` 重复。
- 将每个 `.cursorrules` 改为单行指向：`见同目录 AGENTS.md`（或软引用），把真实规则只留在 `AGENTS.md`。
- **验收**：规则正文只存在于 `AGENTS.md`；`.cursorrules` 不再包含可独立漂移的条目。

---

## P1 架构一致性

### T4. 数据获取层统一走 `@repo/api`
当前 9 个组件直接 `fetch("/api/...")`，绕过类型化 client：
- `apps/web/components/snippets/snippets-list.tsx`
- `apps/web/components/navbar/navbar-mobile-menu.tsx`
- `apps/web/components/navbar/navbar-user-menu.tsx`
- `apps/web/components/comments/comment-replies.tsx`
- `apps/web/components/auth/oauth-grid.tsx`
- `apps/web/components/auth/register-view.tsx`
- `apps/web/components/auth/login-view.tsx`
- `apps/web/components/articles/article-section.tsx`
- `apps/web/components/article-detail/article-float-actions.tsx`

步骤：
1. 审查 `packages/api/src/client.ts`，补齐缺失的端点方法（snippets / oauth / comment-replies / engagement 等），类型放 `packages/api/src/types/`。
2. 逐个组件把裸 `fetch` 替换为 client 调用，错误统一走 `ApiError`（`packages/api/src/errors.ts`）。
3. 与请求强耦合的状态逻辑下沉到对应 `apps/web/hooks/use-*`，组件只消费 hook。
4. **验收**：上述组件内 `grep "fetch("` 为空；新增/更新各组件 `.test.tsx`（mock client）；`pnpm test:run` 通过。
> 注意：route handler（`app/api/**`）内对 Go 后端的转发**不在此列**，那是 `lib/backend-proxy.ts` 的职责，保持不变。

### T5. 上提可复用 Hook 到 `@repo/hooks`
`apps/web/hooks` 中与业务无关的通用 hook 迁移到 `packages/hooks/src/`：
- 明确迁移：`use-media-query`、`use-scroll-progress`、`use-active-heading`、`use-sheet-gesture`。
- 保留在 app 内：`use-comment-*`、`use-guestbook-*`、`use-*-engagement`（绑定业务接口）。
步骤：移动文件 + 同目录 `.test.ts` → 在 `packages/hooks/src/index.ts` 导出 → 全仓改 import 为 `@repo/hooks` → 删除 app 内旧文件。
- **验收**：`grep -rn "use-media-query" apps/web/hooks` 为空；`@repo/hooks` 导出新增项；类型 / 测试通过。

### T6. 重命名中间件，消除 "proxy" 命名歧义
- `apps/web/proxy.ts`（Next 中间件，导出 `proxy` + `config`）与 `apps/web/lib/backend-proxy.ts`（route 转发工具）同名易混。
- 将 `proxy.ts` 内的函数 / 文件语义化（如 `proxy()` → `authGate()`；文件保持 Next 约定名不动则只改函数名 + 顶部注释说明二者区别）。
- **验收**：注释明确区分两者职责；`pnpm run build` 通过，中间件仍生效。

### T7. 清除生产代码对 `_mock` 的依赖
以下生产路径仍 import `app/_mock`：
- `apps/web/app/page.tsx`
- `apps/web/components/sidebar/tags-cloud.tsx`
- `apps/web/components/sidebar/recent-visitors.tsx`
- `apps/web/components/featured/featured-carousel.tsx`、`featured-carousel-slide.tsx`

步骤：改为通过 `@repo/api` 拉真实数据（无后端端点的，先标 `// TODO(api): 待后端提供 xxx 接口` 并保留降级，但 import 路径移出 `_mock`）。`_mock` 仅允许测试文件引用。
- **验收**：`grep -rln "_mock" apps/web/app apps/web/components | grep -v ".test."` 为空。

---

## P2 代码风格

### T8. 拆分巨型组件（单文件 > 250 行）
按优先级：
- `apps/web/components/auth/register-view.tsx`（619 行）→ 拆出表单分步 / 验证码 / OAuth 区块子组件 + 抽 `use-register-form` hook。
- `apps/web/components/snippets/snippets-list.tsx`（367 行）。
- `apps/web/components/comments/comment-section.tsx`（299 行）、`comment-replies.tsx`（277 行）。
- **验收**：拆分后主文件 < 250 行；行为不变（原测试全绿，新增子组件测试）。

### T9. 修复 ui 基础组件的 a11y 关闭点
`packages/ui` 中 toggle / checkbox / radio-buttons / toast 用 `eslint-disable jsx-a11y/click-events-have-key-events`：
- 改用 react-aria-components 的可交互原语或补全 `role` + 键盘处理，移除 disable 注释。
- **验收**：相关文件无 `eslint-disable jsx-a11y/*`；`pnpm lint` 通过；组件键盘可操作（补交互测试）。

---

## 执行顺序与校验
1. 顺序：T1→T2→T3→T4→T5→T6→T7→T8→T9。
2. 每个任务结束运行：`pnpm run check-types && pnpm lint && pnpm test:run`。
3. T4/T5/T7/T8 涉及测试硬性要求，缺测试视为未完成。
