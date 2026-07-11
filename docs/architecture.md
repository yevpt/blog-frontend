# 架构设计

本仓库是个人博客系统的**前端 Monorepo**，由两个应用与一组共享包组成。后端服务（Go）不在本仓库内，通过 REST API 对接。

## Monorepo 结构

```
├── apps/
│   ├── web/            # Next.js App Router —— 博客前台（SSR）
│   └── admin/          # Vite + React Router —— 运营管理后台（SPA）
└── packages/
    ├── api/                 # 统一后端 API 客户端（鉴权请求、各资源类型与方法）
    ├── ui/                  # 共享基础 UI 组件库（React Aria + Tailwind）
    ├── hooks/               # 跨应用复用的 React Hooks（图片压缩/上传、CDN、presence…）
    ├── editor/              # 富文本编辑器（Tiptap，文章创作，web/admin 共用）
    ├── markdown/            # Markdown 渲染（客户端 + 服务端两套）
    ├── tracker/             # 前端行为埋点 SDK（采集 + 上报）
    ├── icons/               # SVG 雪碧图图标系统
    ├── styles/              # 共享 Tailwind 基础样式
    ├── eslint-config/       # 统一 ESLint 基线（base/react/next）
    └── typescript-config/   # 统一 tsconfig 基线（base/react/next）
```

## 依赖方向与复用原则

- 依赖单向流动：`apps/*` 依赖 `packages/*`，`packages/*` 之间可互相引用，但**包不能反向依赖 app**。
- 各 `packages/*` 均以 `workspace:*` 被引用。**任何通用逻辑优先沉淀到 `packages/*`**，避免 web/admin 各写一份平行实现。
- 无 Turborepo，构建/测试统一用 pnpm `-r` 递归脚本，测试用全仓库统一的根 Vitest 配置。

各包的职责与入口，见 [packages.md](packages.md)。

## 共享层的关键取舍

### API 客户端（`@repo/api`）

接口契约统一在 `@repo/api` 维护，区分三类请求 helper：**public / 可选鉴权 / 必须鉴权**，避免裸 `fetch` 散落在业务代码里。资源类型集中在 `packages/api/src/types/*`（article、comment、moment、notification、moderation 等），供两个 app 共享。

> 新增端点或类型的规范见 `.agents/skills/extending-api/SKILL.md`。

### 图标系统（`@repo/icons`）

采用 **SVG 雪碧图**方案：原始 SVG 集中存放于 `packages/icons/svg/`，构建脚本 `scripts/build.mjs` 合并生成 `src/generated/`（雪碧图 + 类型），运行时通过 `<use>` 引用。天然兼容 Vite 与 Next.js 两套构建环境。改图标后需重新生成：

```bash
pnpm --filter @repo/icons build
```

详见 [`packages/icons/README.md`](../packages/icons/README.md)。

### 样式与组件

- `@repo/styles` 提供共享 Tailwind 基础样式，两个 app 各自的入口再叠加自身配置。
- `@repo/ui` 基于 React Aria Components 封装无样式可访问原语 + Tailwind 皮肤，是业务 UI 的复用基座；写 UI 前先查此库，规范见 `.agents/skills/building-ui/SKILL.md`。

## 应用详解

- 博客前台 `apps/web` —— [app-web.md](app-web.md)
- 管理后台 `apps/admin` —— [app-admin.md](app-admin.md)
