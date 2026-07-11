# 共享包（packages/*）

所有共享逻辑沉淀在此层，以 `workspace:*` 被 `apps/*` 引用。实现通用逻辑前**先查这里是否已有**，禁止平行实现。

## 运行时包

| 包 | 职责 | 关键点 |
|---|---|---|
| `@repo/api` | 统一后端 API 客户端 | 三类请求 helper（public / 可选鉴权 / 必须鉴权）；资源类型集中在 `src/types/*`（article、comment、moment、notification、moderation…）；统一错误处理 `errors.ts` |
| `@repo/ui` | 共享基础 UI 组件库 | 基于 React Aria Components + Tailwind；覆盖 button、input、select、modal、table、tabs、toast、carousel、date-picker 等原语 |
| `@repo/hooks` | 跨应用 React Hooks | 图片压缩/上传、CDN 优化图片、延迟媒体激活、presence（在线状态）、编辑器图片上传等 |
| `@repo/editor` | 富文本编辑器 | 基于 Tiptap；自定义扩展（image-gallery、mention、code-block、character-limit…）、工具栏、对话框，web/admin 共用文章创作 |
| `@repo/markdown` | Markdown 渲染 | 客户端（`markdown-content.tsx`）+ 服务端（`server.ts` / `markdown-static.tsx`）两套；含图片画廊、懒加载、骨架屏、摘要提取 |
| `@repo/tracker` | 前端埋点 SDK | 采集（session、payload）+ 上报（transport），提供 React 绑定 |
| `@repo/icons` | SVG 雪碧图图标系统 | 源文件在 `svg/`，构建生成 `src/generated/`；改图标后需 `pnpm --filter @repo/icons build`，详见 [`packages/icons/README.md`](../packages/icons/README.md) |
| `@repo/styles` | 共享 Tailwind 基础样式 | `base.css` |

## 配置包

| 包 | 职责 |
|---|---|
| `@repo/eslint-config` | 统一 ESLint 基线（base / react / next） |
| `@repo/typescript-config` | 统一 tsconfig 基线（base / react / next） |

## 每包脚本

大部分包提供统一脚本：`test`、`test:watch`、`check-types`、`lint`、`lint:fix`。`@repo/icons` 额外提供 `build`（生成雪碧图）。
