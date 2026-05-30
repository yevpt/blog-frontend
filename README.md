# Blog Frontend Monorepo

基于 pnpm workspaces 的博客前端 Monorepo，包含 Next.js SSR 博客站（`apps/web`）和 Vite React 管理后台（`apps/admin`），共享 UI 组件库、Hooks 和图标系统。

## 项目结构

```
├── apps/
│   ├── admin/          # Vite + React SPA（管理后台）
│   └── web/            # Next.js App Router（博客前台）
└── packages/
    ├── hooks/          # 共享自定义 Hooks
    ├── icons/          # SVG 雪碧图图标系统
    ├── styles/         # 共享样式
    ├── ui/             # 共享 UI 组件库
    └── typescript-config/
```

## 快速开始

```bash
pnpm install
pnpm dev:web     # http://localhost:3000
pnpm dev:admin   # http://localhost:5173
```

---

## SVG 图标系统
图标系统采用 **SVG 雪碧图**方案，由 `@repo/icons` 包统一管理。

所有原始 SVG 文件集中存放，构建脚本将其合并为单一雪碧图，通过 `<use>` 引用，天然兼容 Vite 和 Next.js 两套构建环境。

具体配置可参考：@repo/icons/README.md

---

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm test` | 运行全部测试（watch 模式）|
| `pnpm test:run` | 运行全部测试（单次）|
| `pnpm check-types` | 全量 TypeScript 类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm --filter @repo/icons build` | 重新生成 SVG 雪碧图 |
