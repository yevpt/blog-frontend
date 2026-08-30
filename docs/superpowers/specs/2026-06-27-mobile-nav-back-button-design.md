# 移动端导航返回按钮 — 设计文档

日期：2026-06-27
范围：`apps/web`

## 背景与问题

移动端非首页页面（文章详情、碎语、留言、友邻、圈子、消息中心等）顶部导航左侧是返回按钮。当前实现 [navbar-mobile-header.tsx](../../../apps/web/components/navbar/navbar-mobile-header.tsx) 把返回硬编码为 `router.push("/")`，`aria-label` 也写死「返回首页」。

后果：从「留言 → 某文章 → 点返回」会直接回首页，而不是回留言列表，导航链路被打断，不符合用户对「返回上一页」的直觉。

目标：返回按钮回到**用户真正访问过的上一页**；仅当站内没有可返回历史（外链/分享/直接落地）时，兜底到一个合理父级。

## 核心约束与取舍

判断「站内是否有可返回历史」存在一个**不可约的歧义**：仅凭 `usePathname()` 无法区分「后退回到 X」与「点前进链接又到了 X」——两者观测信号完全相同。任何自己记账（boolean / 深度计数器 / 内存栈）的方案都受此限制。

浏览器出于隐私隐藏了三样东西：当前历史索引、条目是否同源、一次 `popstate` 的方向。`window.history.length` 含站外条目且后退不减，不可靠。

因此采用**分层降级**：能用浏览器权威信号就用，不能用就退到永不静默出错的启发式。

## 方案

### 兜底父级

首页 `/` 即文章中心，无独立文章列表页 → **所有页面站内无历史时一律兜底到 `/`**，不需要 per-route 映射表。

### 新增 Hook：`useBackNavigation`

位置：`apps/web/components/navbar/use-back-navigation.ts`，对外只暴露 `goBack()`。

`SiteNavbar` 常驻根布局（[app/layout.tsx](../../../apps/web/app/layout.tsx)），跨软导航不卸载，因此 Hook 内的追踪逻辑能覆盖整段会话。

决策分两层：

**第一层（首选）— Navigation API**

特性检测 `window.navigation`。存在时用 `navigation.canGoBack`（浏览器内核维护的同源历史真相）：

- 零歧义：内核知道方向与索引，分得清「后退」与「前进到同路径」。
- 零失同步：原生侧滑/前进/手势由内核记账，`canGoBack` 始终准。
- 跨源条目天然不计入 → 从外链落地时 `canGoBack === false`，正确识别「地板」。

覆盖范围：Chromium（Chrome/Edge 102+，含 Android Chrome）——即「移动端 + 返回手势」主场景。

**第二层（回退）— A+ 启发式**（Safari/iOS、Firefox、老浏览器）

依赖三个**永不中途漂移**的信号，故抗原生手势、不会静默出错：

- `hasNavigatedInApp`：模块级布尔，记录本次页面加载后是否发生过站内软导航；首次挂载（落地页）不计，之后任一 pathname 变化置 `true`（单向翻转，不可能失同步）。
- `entryPath`：首次挂载捕获的落地页 pathname，捕获一次、永不变。
- 实时 `pathname`（`usePathname()`，始终准确）。

**决策逻辑**：

```text
goBack():
  // 第一层：浏览器权威信号
  if (window.navigation 存在):
     return window.navigation.canGoBack ? router.back() : router.push("/")

  // 第二层：A+ 启发式
  if (!hasNavigatedInApp)            return router.push("/")   // 直接落地/外链
  if (currentPathname === entryPath) return router.push("/")   // 已退回地板，避免退出站外
  return router.back()
```

注意：`canGoBack` 仅用于**决策**；实际动作始终走 Next 的 `router.back()` / `router.push(fallback)`，不掺和 Navigation API 与 Next 路由的交互，最稳。

A+ 的残留边界：通过「前进链接」回到与落地页完全相同的路径时，这次返回会去首页而非上一页。代价轻微（首页是合理目的地），且仅在不支持 Navigation API 的浏览器上出现。

### 碎语统一为返回按钮

[navbar-route-config.ts](../../../apps/web/components/navbar/navbar-route-config.ts)：

- 移除 `/moments` 的 `home` 分支，使其落入 `default` variant。
- `DEFAULT_ROUTE_TITLES` 新增 `"/moments": "碎语"`。

改后移动端 `/moments` 呈现：左返回 + 居中标题「碎语」+ 右菜单，与留言/友邻一致。变更后仅 `/` 为 `home` variant。

### NavbarMobileHeader 收尾

[navbar-mobile-header.tsx](../../../apps/web/components/navbar/navbar-mobile-header.tsx)：

- 用 `useBackNavigation()` 的 `goBack` 替换 `router.push("/")`。
- `aria-label` 从「返回首页」改为「返回」（已不总是回首页）。
- Hook 在组件顶部无条件调用（home 分支提前返回前），满足 Hooks 规则。

## 模块边界

| 单元                  | 职责                                      | 依赖                                                                |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| `useBackNavigation`   | 判断可返回性并执行返回/兜底，封装分层决策 | `next/navigation`（`useRouter`/`usePathname`）、`window.navigation` |
| `navbar-route-config` | 路由 → variant/title 映射（纯函数）       | 无                                                                  |
| `NavbarMobileHeader`  | 渲染移动端头部，消费 `goBack`             | `useBackNavigation`、route-config                                   |

`useBackNavigation` 的内部记账（模块级标志、entryPath）对消费者不可见，仅暴露 `goBack`；后续若 Navigation API 支持面扩大，可删 A+ 分支而不影响调用方。

## 测试

- 新增 `use-back-navigation.test.ts`：
  - Navigation API 路径：`canGoBack === true` → 调 `router.back()`；`=== false` → 调 `router.push("/")`。
  - A+ 回退路径（mock 掉 `window.navigation`）：未站内导航 → push `/`；站内导航后当前路径 === 落地路径 → push `/`；站内导航后路径不同 → `router.back()`。
- 更新 `navbar-mobile-header.test.tsx`：返回按钮触发 `goBack` 而非直接 push；`aria-label` 为「返回」。
- 更新 `navbar-route-config` 相关测试：`/moments` → `default` variant + title「碎语」；仅 `/` 为 `home`。

环境/mock 配方遵循 `.agents/skills/writing-tests/SKILL.md`。

## 非目标（YAGNI）

- 不做 per-route 兜底映射表（兜底统一 `/`）。
- 不实现深度计数器 / `history.state` 序号方案（与 Next 内部抢 state，易静默失同步）。
- 不做固定父级导航（牺牲真实历史换确定性，非本需求）。
