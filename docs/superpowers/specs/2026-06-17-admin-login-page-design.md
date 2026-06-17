# Admin 登录页与主题能力设计

**日期**: 2026-06-17  
**状态**: 待确认

## 目标

为 `apps/admin` 设计一套全新的登录页。页面只支持用户名和密码登录，但需要具备完整后台入口质感，并像 `apps/web` 一样真实支持浅色和深色主题。

本次范围包含：

- 重做 `apps/admin/src/pages/LoginPage.tsx` 的视觉、结构和交互。
- 为 `apps/admin` 补齐可复用的主题能力：`system`、`light`、`dark` 三态。
- 更新登录页测试，覆盖新页面的核心行为。

本次范围不包含：

- 注册、找回密码、多因素认证、OAuth 登录。
- 后台首页和其他管理页面重设计。
- 登录接口协议调整。

## 设计方向

采用“安静专业”的后台入口风格。桌面端为双栏布局：左侧承载后台身份说明，右侧承载登录表单；移动端折叠为单列，优先展示登录表单。

页面不使用大面积营销式 hero、强渐变或装饰图形。视觉重点是清晰的层级、稳定的留白、低干扰边框和明暗主题下都舒适的对比度。

## 页面结构

### 外层布局

- `<main>` 铺满视口：`min-h-dvh bg-background text-foreground`。
- 内容容器：移动端单列，`lg` 以上双栏。
- 背景仅使用语义 token 和轻量边框/透明度，例如 `bg-background`、`bg-card`、`border-border`、`text-muted-foreground`。
- 不写死浅色或深色颜色值，必要的透明效果使用 `foreground` / `primary` 的低透明度。

### 左侧信息区

桌面端显示，移动端可精简到表单上方：

- 标题：`博客后台`
- 描述：`管理文章、草稿与发布状态。`
- 3 个轻量信息点：
  - 内容发布
  - 草稿管理
  - 会话保护
- 可使用 `SvgIcon` 的 `shield`、`edit`、`check` 等现有图标。

左侧内容不承担导航功能，只用于建立后台入口身份感。

### 右侧登录表单

表单使用共享 UI 组件：

- `Card` / `CardHeader` / `CardContent` 作为登录面板。
- `Input` + `Label` + `HintText` 作为用户名、密码字段。
- `Button` 作为提交按钮。
- `ButtonUtility` 或 `Button` 图标按钮用于密码显示切换和主题切换。
- 图标统一使用 `@repo/icons` 的 `SvgIcon`。

字段：

- 用户名：`type="text"`，label 为 `用户名`，可继续映射到现有 `identifier` 请求字段。
- 密码：`type="password"` / `type="text"` 切换，label 为 `密码`。
- 提交按钮：默认文本 `登录`，提交中显示 `登录中...`。

状态：

- 登录中：按钮进入 loading/pending 状态，避免重复提交。
- 登录失败：表单内显示 `role="alert"` 错误文本。
- 登录成功：沿用现有认证流程，写入 access token、user、refresh token，并跳转 `/`。

## 主题能力

`apps/admin` 采用与 `apps/web` 一致的主题策略，但实现为 Vite SPA 版本。

### 主题模式

- `system`：默认模式，不在 `html` 上保留 `dark` / `light` class，由 CSS 媒体查询跟随系统。
- `light`：在 `html` 添加 `light`，移除 `dark`。
- `dark`：在 `html` 添加 `dark`，移除 `light`。

显式选择 `light` / `dark` 时写入 `theme` cookie，保留 6 小时；选择 `system` 时清除 cookie。这样行为与 `apps/web` 保持一致。

### 首屏防闪烁

在 `apps/admin/index.html` 中加入极小的内联主题初始化逻辑：

- 读取 `theme` cookie。
- `theme=dark` 时首屏给 `html` 加 `dark`。
- `theme=light` 时首屏给 `html` 加 `light`。
- 无 cookie 时不加 class，由 `packages/styles/src/base.css` 的 `prefers-color-scheme` 规则接管。

同时加入只包含背景色和 `color-scheme` 的关键样式，避免深色系统下首屏闪白。

### Provider 与 Hook

在 `apps/admin/src/providers/theme-provider.tsx` 新增：

- `ThemeProvider`
- `useTheme`
- `ThemeMode = "system" | "light" | "dark"`
- `ResolvedTheme = "light" | "dark"`

`App` 根部包裹 `ThemeProvider`，登录页通过 `useTheme` 获取 `resolvedTheme` 和 `setTheme`。

登录页右上角提供浅/深切换按钮：

- 当前为浅色时显示 `sun`，点击切到 `dark`。
- 当前为深色时显示 `moon`，点击切到 `light`。
- `aria-label` 与 web 端一致描述当前生效主题和点击后的目标主题。

## 文件影响

- `apps/admin/index.html`：新增首屏主题关键样式和初始化脚本。
- `apps/admin/src/App.tsx`：接入 `ThemeProvider`。
- `apps/admin/src/providers/theme-provider.tsx`：新增 admin 主题 provider。
- `apps/admin/src/pages/LoginPage.tsx`：重做登录页 UI。
- `apps/admin/src/pages/LoginPage.test.tsx`：重写测试，覆盖新行为。
- `apps/admin/src/providers/theme-provider.test.tsx`：新增主题 provider 测试。

## 测试

登录页测试覆盖：

- 渲染后台登录入口、用户名字段、密码字段和登录按钮。
- 点击密码可见性按钮后，密码输入框在 `password` / `text` 间切换。
- 登录成功后调用现有 API、更新 auth store、写入 `refresh_token`。
- 登录失败后展示 `role="alert"` 错误信息。
- 提交中按钮进入 loading 状态，避免重复点击。

主题 provider 测试覆盖：

- 无 cookie 时默认 `system`。
- cookie 为 `dark` / `light` 时恢复对应模式。
- 切换到 `dark` / `light` 后同步 `html` class 和 cookie。
- 切换到 `system` 后清除 cookie，并移除 `html.dark/html.light`。

## 验收标准

- `apps/admin` 登录页在浅色和深色主题下均无硬编码失配颜色。
- 页面在移动端和桌面端不溢出、不重叠，表单优先可用。
- 所有基础 UI 复用 `@repo/ui`，图标复用 `@repo/icons`。
- `pnpm --filter admin test` 通过。
- `pnpm --filter admin check-types` 通过。
