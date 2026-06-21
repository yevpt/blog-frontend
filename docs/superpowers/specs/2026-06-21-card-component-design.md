# 统一 Card 组件与精修边缘视觉

日期：2026-06-21
范围：组件升级 + 全量迁移
状态：待评审

## 背景与问题

`@repo/ui` 已存在 `Card`（`rounded-xl border bg-card shadow-sm`，shadcn 默认风格），但**几乎无人使用**。项目里各业务卡片各写各的，且把同一串"魔法阴影"反复复制：

```
shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]          // 静态
shadow-[0_4px_8px_rgba(0,0,0,0.07),0_14px_36px_rgba(0,0,0,0.08)]         // hover
```

出现位置：`snippet-card`、`snippets-section`、`article-card`、`guestbook-list`、`sidebar/recent-visitors`、`sidebar/tags-cloud` 等。

用户的核心不满：**默认 Card 的"边缘"难看** —— 一道实心灰 `border` + 扁平 `shadow-sm`，缺层次、暗色下生硬。

结论：好看的视觉语言其实已自发存在于散落代码里，只是没沉淀成组件，也没统一边缘处理。本任务把它收敛进 `Card`，并按方案 C 精修边缘。

## 设计决策

- **视觉方向：C 精修边缘**。用极淡的环形阴影（`0 0 0 1px`）+ 柔和环境阴影代替实心 `border`，边缘更软、暗色更自然。
- **落地范围：组件 + 全量迁移**。升级 `@repo/ui` Card，并把"浮起内容卡片"类用法替换为统一 Card。

## 一、设计令牌（单一来源）

在 `packages/styles/src/base.css` 的 `@theme` 中新增卡片阴影令牌，暗色用 `@variant dark` 覆盖。Tailwind v4 会据此生成 `shadow-card` / `shadow-card-hover` 工具类。

```css
/* @theme（浅色） */
--shadow-card:
  0 0 0 1px rgba(0, 0, 0, 0.04),
  0 1px 2px rgba(0, 0, 0, 0.04),
  0 10px 28px -10px rgba(0, 0, 0, 0.12);
--shadow-card-hover:
  0 0 0 1px rgba(0, 0, 0, 0.05),
  0 4px 10px -2px rgba(0, 0, 0, 0.08),
  0 18px 40px -12px rgba(0, 0, 0, 0.16);

/* @variant dark（覆盖同名变量） */
--shadow-card:
  0 0 0 1px rgba(255, 255, 255, 0.06),
  0 1px 2px rgba(0, 0, 0, 0.4),
  0 10px 28px -10px rgba(0, 0, 0, 0.6);
--shadow-card-hover:
  0 0 0 1px rgba(255, 255, 255, 0.10),
  0 4px 10px -2px rgba(0, 0, 0, 0.5),
  0 18px 40px -12px rgba(0, 0, 0, 0.7);
```

要点：
- 第一层 `0 0 0 1px` 即"边缘"，代替实心 `border`，因此 C 方案的 Card **不再用 `border` 类**。
- 暗色用白色半透明环 + 更深环境阴影，避免灰边在深色面板上发灰。
- 所有引用方（组件 + 少数响应式特例）都指向这两个令牌，魔法阴影字符串就此消除。

## 二、Card 组件 API

文件：`packages/ui/src/card/card.tsx`（保持现有 compound 结构与导出）。

保留并继续导出：`Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent`。
新增导出：`CardFooter`（多处卡片底部有操作区，常用）。

`Card` props（在 `React.HTMLAttributes<HTMLDivElement>` 基础上扩展）：

```ts
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否可交互：加 hover 浮起 + 过渡 + 指针。默认 false（静态卡片）。 */
  interactive?: boolean;
}
```

root 默认类（方案 C）：

```
rounded-2xl bg-card text-card-foreground shadow-card
```

`interactive` 为 true 时追加：

```
transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover
```

说明：
- 不再有 `border` 类；圆角统一 `rounded-2xl`（收敛现状 `rounded-xl/2xl/[14px]` 的分歧，取最常用的 2xl）。
- padding 仍由 `CardHeader`/`CardContent`/`CardFooter` 负责，root 不带内边距，沿用现有约定。
- `className` 透传到 root，可被使用方覆盖（如个别卡片需要 `bg-secondary`、自定义圆角、响应式开关）。
- `CardFooter`：`flex items-center p-6 pt-0`，与 Header/Content 间距一致。

> 本组件为静态/轻交互展示容器，无新增 ARIA 语义；若整卡可点击，由使用方在 root 包 `Link`/`button` 并自管焦点（沿用现有页面做法）。

## 三、迁移清单

### 范围内（替换为统一 Card）
浮起内容卡片，当前手写卡壳：

| 文件 | 现状 | 迁移后 |
| --- | --- | --- |
| `components/snippets/snippet-card.tsx:197` | `rounded-2xl border ... shadow-[魔法]` + 无效类 `snippet-card-raised` | `<Card interactive>`；删除 `snippet-card-raised` |
| `components/snippets/snippet-card-skeleton.tsx:64` | 同款魔法阴影 | `<Card>`（骨架，不交互） |
| `components/snippets/snippets-section.tsx:64` | `rounded-2xl border ... shadow-[魔法]` | `<Card>` |
| `components/guestbook/guestbook-list.tsx:74` | `rounded-2xl border bg-white dark:bg-card shadow-[魔法]` | `<Card>`（`bg-white` 覆盖归一为 `bg-card`） |
| `components/sidebar/recent-visitors.tsx:16` | `rounded-[14px] border ... shadow-[魔法]` | `<Card>` |
| `components/sidebar/tags-cloud.tsx:15` | `rounded-[14px] border ... shadow-[魔法]` | `<Card>` |
| `app/users/[id]/_components/user-profile-page.tsx:46` | `rounded-xl border bg-card shadow-sm` | `<Card>` |
| `app/users/[id]/_components/user-info-header.tsx:71` | `rounded-xl border bg-card shadow-sm` | `<Card>` |
| `app/users/[id]/_components/skeleton/user-profile-skeleton.tsx:13,29` | `rounded-xl border bg-card shadow-sm` | `<Card>` |
| `components/article-detail/article-toc.tsx:99` | `rounded-lg border bg-card` | `<Card>` |

### 特例（保留 bespoke 结构，只把阴影换成令牌）
- `components/articles/article-card.tsx:32`：卡片样式仅 `md:` 以上出现 + group hover 浮起。**不套 Card**（响应式断点逻辑属业务），但把 `shadow-[魔法]` / hover 阴影替换为 `md:shadow-card md:group-hover:shadow-card-hover`，并去掉 `md:border`（令牌已含边缘环）。

### 范围外（不是浮起卡片，保持不动）
- 弹层/菜单：`navbar-user-menu.tsx`、`article-detail/music-player.tsx`（popover，自带 `shadow-lg/xl`）。
- 表单/输入容器：`(auth)/login|register`、`security-tab` 等内联输入框。
- 装饰/状态：spinner、badge、pill、`featured-*`、`friend-links-rules-card`（`bg-secondary` 提示框，语义不同）。
- `featured-post-picker.tsx:35`（`bg-background p-4` 浅容器，非浮起卡）。

## 四、验证

- 组件测试 `packages/ui/src/card/card.test.tsx`：在现有基础上补 —— ① 默认不含 `border`、含 `shadow-card`；② `interactive` 加 `hover:shadow-card-hover`、`hover:-translate-y-0.5`；③ `CardFooter` 渲染与 `className` 透传；④ 保留 compound 渲染与 h3 用例。
- 迁移涉及的 app 组件：跑各自既有 `*.test.tsx`，断言文案/结构不回归（多数测试不针对具体阴影类，应自然通过）。
- preview 验证：浅色 + 暗色各截一张（snippet 列表 / sidebar / 用户资料页），确认边缘柔和、hover 浮起、暗色不发灰。

## 五、不做（YAGNI）

- 不引入 `variant`/`size`/`asChild` 等多余 API；只加 `interactive` 与 `CardFooter`。
- 不改弹层/菜单/输入容器的视觉。
- 不为 `article-card` 的响应式特殊性强行抽象——令牌共享已足够。
