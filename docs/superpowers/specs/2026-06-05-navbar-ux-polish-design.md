# Navbar UX Polish 设计规格

**日期**：2026-06-05  
**涉及文件**：`apps/web/components/navbar/navbar-mobile-menu.tsx`、`navbar-user-menu.tsx`

---

## 一、移动端：cursor-pointer 修复

**问题**：`actionClass` 里没有 `cursor-pointer`，导致主题切换和退出按钮 hover 时光标不变成手型。

**修复**：在 `actionClass` 字符串末尾加入 `cursor-pointer`。涉及所有使用该 class 的按钮（消息、主题、退出）。

---

## 二、移动端：已登录状态退出按钮背景色

**问题**：退出按钮当前 `bg-destructive/[0.07]` 过淡，与其它操作项视觉区分度不够。

**修复**：改为 `bg-destructive/[0.10]`，hover 改为 `hover:bg-destructive/[0.14]`，颜色保持 `text-destructive/80 hover:text-destructive`。

---

## 三、移动端：未登录状态主题切换区重设计（A2-1）

**问题**：当前是 `<div className="mt-3 flex">{themeToggle}</div>` 单按钮，太单薄。

**新设计**：移除原 `themeToggle` 复用组件，替换为独立的「设置行」，紧接导航链接下方：

```
──────────── border-t border-border/60 ────────────
[分割线，与 nav 链接区隔开]

<button 整行可点击，cursor-pointer>
  左侧：[图标 moon/sun, 15px, opacity-75]  [文字「深色模式」/「浅色模式」, 13px, font-medium, fg2]
  右侧：[Toggle 开关 UI]
    - 外框：w-9 h-5 rounded-full，深色时 bg-primary/80，浅色时 bg-foreground/20
    - 滑块：w-4 h-4 rounded-full bg-white，深色时 translate-x-4，浅色时 translate-x-0.5
    - transition-all duration-200
</button>
```

Toggle 是纯视觉元素，点击整行触发 `setTheme(nextTheme)`，不需要真实 checkbox。

---

## 四、桌面端：头像触发按钮 cursor-pointer

**问题**：`navbar-user-menu.tsx` 的 `<button>` 没有 `cursor-pointer`。

**修复**：在 `className` 的 `cn(...)` 中加入 `cursor-pointer`。

---

## 五、桌面端：下拉框结构重设计（F3 布局 + H2 细节）

**问题**：顶部渐变卡片直接复用移动端样式，在窄下拉框里失衡，且显示冗余头像。

### 新下拉框结构

```
┌─────────────────────────────────────┐
│  [昵称行 · 内嵌菜单项]                │  ← bg-primary/[0.07] rounded-xl，整行跳 /profile
│  用户昵称                             │
│  管理账号 →（淡紫色，font-medium）    │  ← text-primary/70，右侧 chevron-right 淡色
├─────────────────────────────────────┤  ← border-t border-border/60
│  [plus icon]  发表碎语                │
│  [bell icon]  我的消息    [未读数]    │  ← 见下方徽标规则
├─────────────────────────────────────┤  ← border-t border-border/60（普通颜色）
│  [log-out icon]  退出登录             │  ← text-destructive，独立底部区域
└─────────────────────────────────────┘
```

**变化摘要：**

- 移除顶部渐变卡片（`m-1.5 flex w-[calc(100%-12px)]...`）
- 昵称行：无头像，昵称 `text-[13px] font-bold`，副标题 `text-[11px] text-primary/70 font-medium`
- 「消息」改名为「我的消息」，图标从 `message-circle` 改为 `bell`
- 退出登录用独立 `border-t border-border/60` 区域隔离（非红色分割线）

### 未读数徽标规则

`NavbarUserMenu` 接收可选 prop：`unreadCount?: number`（默认 0，后续从 session/store 接入）。

| unreadCount | 显示       |
| ----------- | ---------- |
| 0           | 不显示     |
| 1–99        | 显示数字   |
| > 99        | 显示 `99+` |

徽标样式：`bg-destructive text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center`

---

## 六、桌面端：退出登录交互动效

**问题**：点击反馈不明显，需要更清晰的 hover 状态。

**修复**（在新结构中实现）：

- `cursor-pointer`（button 已隐含，但需确认）
- `transition-colors duration-150`
- 默认：`text-destructive/80`
- hover：`bg-destructive/[0.07] text-destructive`

---

## 七、移动端已登录状态：「消息」同步改名

移动端 `navbar-mobile-menu.tsx` 中「消息」同步改名为「我的消息」，图标同步改为 `bell`。

---

## 不在本次范围内

- 未读数的数据来源接入（需要单独 API/store 设计）
- 移动端下拉框的消息徽标（移动端已有独立消息链接，可后续迭代）
