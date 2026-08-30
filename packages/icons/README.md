# SVG 图标系统

图标系统采用 **SVG 雪碧图**方案，由 `@repo/icons` 包统一管理。所有原始 SVG 文件集中存放，构建脚本将其合并为单一雪碧图，通过 `<use>` 引用，天然兼容 Vite 和 Next.js 两套构建环境。

## 目录结构

```
packages/icons/
├── svg/                   # ← 所有图标源文件（唯一资源目录）
│   ├── home.svg
│   └── user.svg
├── scripts/
│   └── build.mjs          # 构建脚本：将 svg/ 编译为 TypeScript
└── src/
    ├── generated/
    │   ├── sprite.ts       # 自动生成，请勿手动编辑
    │   └── types.ts        # 自动生成，请勿手动编辑
    ├── SvgSprite.tsx       # 将雪碧图注入 DOM
    └── SvgIcon.tsx         # 图标渲染组件
```

## 使用方式

**第一步：在应用根组件注入雪碧图（一次即可）**

```tsx
// apps/web/app/layout.tsx 或 apps/admin/src/App.tsx
import { SvgSprite } from "@repo/icons";

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <SvgSprite />
        {children}
      </body>
    </html>
  );
}
```

**第二步：在任意组件中使用图标**

```tsx
import { SvgIcon } from "@repo/icons";

// 基础用法
<SvgIcon name="home" />

// 自定义尺寸（默认 24）
<SvgIcon name="user" size={32} />

// 通过 className 控制颜色和样式
<SvgIcon name="search" className="text-blue-500 hover:text-blue-700" />
```

`name` 属性由 TypeScript 严格约束，填写不存在的图标名时编译器会报错。

### 新增图标

1. 将 `.svg` 文件放入 `packages/icons/svg/` 目录
2. 运行构建脚本重新生成雪碧图：

   ```bash
   pnpm --filter @repo/icons build
   ```

3. 将生成文件和新 SVG 一起提交：

   ```bash
   git add packages/icons/svg/new-icon.svg packages/icons/src/generated/
   git commit -m "feat(icons): 新增 new-icon 图标"
   ```

完成后，`IconName` 类型自动包含新图标名，全项目立即可用。

## 删除图标

1. 从 `packages/icons/svg/` 删除对应 `.svg` 文件
2. 运行 `pnpm --filter @repo/icons build` 重新生成
3. 搜索项目中对该图标名的所有引用并清理（编译器会报类型错误提示）

## SVG 文件规范

放入 `svg/` 的图标文件需满足：

- 使用 `viewBox="0 0 24 24"` 坐标系（标准 24×24）
- 颜色使用 `stroke="currentColor"` 或 `fill="currentColor"`，以便通过 CSS 继承控制颜色
- 文件名使用 `kebab-case`，即为最终的图标名（如 `chevron-left.svg` → `name="chevron-left"`）
- 去除不必要的 `id`、`class` 等属性，保持内容干净

## 内置图标

| 名称   | 名称    | 名称           | 名称            |
| ------ | ------- | -------------- | --------------- |
| `home` | `user`  | `search`       | `plus`          |
| `menu` | `close` | `chevron-left` | `chevron-right` |
