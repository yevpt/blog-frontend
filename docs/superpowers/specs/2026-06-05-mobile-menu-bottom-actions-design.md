# Mobile Menu Bottom Actions 重设计

**日期**: 2026-06-05  
**文件**: `apps/web/components/navbar/navbar-mobile-menu.tsx`  
**状态**: 已确认，待实施

---

## 背景

登录态下拉菜单底部三个等宽小按钮（消息 / 主题 / 退出）视觉质量差，缺乏层次感，且消息按钮无法承载未读徽标。

---

## 最终设计

### 1. 用户卡片区——加入退出按钮

当前 `<Link>` 包裹整个卡片，需重构为外层 `div` + 内层 `Link`（头像 + 名字）+ 独立 `button`（退出）。

**结构变更：**
```
div.user-card [gradient bg]
  ├── Link href="/profile"   → 头像 + 姓名/副标题（flex: 1）
  └── button[type=button]   → SvgIcon name="log-out"（退出）
```

**用户卡片背景**（同时更新未登录态，保持一致）：
- 当前：`rounded-[18px] bg-gradient-to-br from-primary/[0.10] to-amber-500/[0.13]`
- 新：`rounded-2xl bg-gradient-to-br from-primary/[0.08] to-amber-500/[0.10]` + hover 略加深

**退出按钮交互规格：**

| 状态 | 样式 |
|------|------|
| 默认（浅色） | `text-foreground/[0.28]`，无背景 |
| 默认（深色） | `dark:text-foreground/[0.45]`，无背景（修复深色模式不可见问题） |
| Hover | `hover:bg-destructive/[0.10] hover:text-destructive/70` |
| Hover 深色 | `dark:hover:bg-destructive/[0.15] dark:hover:text-destructive/80` |
| Active | `active:scale-90` |
| Transition | `transition-all duration-150` |

图标：`SvgIcon name="log-out" size={16}`

---

### 2. 底部操作区——替换三列按钮为两行列表

移除 `grid grid-cols-3` 三按钮区，改为与导航项视觉语言一致的全宽列表行，用 `border-t border-border/60` 分隔。

#### 消息行

```
Link href="/messages"
  [icon-box blue]  bell icon
  "我的消息"
  [badge]          仅 unreadCount > 0 时显示
                   1–99 → 显示数字；≥100 → "99+"
```

**Props 新增：**
```ts
interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount?: number;   // 新增，未读消息数
}
```

**无箭头**（右侧不放 chevron-right，与主题行右侧对齐）。

#### 主题行

与**未登录态完全一致**，复用相同 className：

```
button（全宽）
  <div className="flex items-center gap-2.5">
    SvgIcon sun/moon  size={15}  className="text-[var(--fg2)] opacity-75"
    span "浅色模式" / "深色模式"
  </div>
  <div toggle-track>
    <div toggle-thumb />
  </div>
```

Toggle 样式（已有，直接复用）：
- Track: `h-5 w-9 rounded-full transition-colors duration-200`，开 `bg-primary/80`，关 `bg-foreground/20`
- Thumb: `absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200`，开 `translate-x-4`，关 `translate-x-0.5`
- Row hover: `hover:bg-foreground/[0.04]`

---

### 3. 未登录态主题切换

保持现有样式不变（已是正确的列表行风格），只需确保与登录态主题行 className 完全相同。

---

## 未读徽标样式

```
bg-destructive text-destructive-foreground
text-[10px] font-bold
min-w-[18px] h-[18px] rounded-full
flex items-center justify-content px-1
```

---

## 不变的部分

- `NAV_ITEMS` 导航项循环渲染逻辑
- `navLinkClass`（导航行样式）
- `handleLogout` 函数逻辑
- `useSession`、`useTheme`、`useLocale` 等 hooks 使用方式

---

## 测试要求

新增 / 更新 `navbar-mobile-menu.test.tsx`：

1. 渲染不崩溃（登录态 / 未登录态）
2. 登录态显示退出按钮，点击触发 logout（mock fetch）
3. `unreadCount` 为 0 或 undefined 时不渲染徽标
4. `unreadCount=5` 渲染 "5"；`unreadCount=100` 渲染 "99+"
5. 主题切换按钮触发 `setTheme`
