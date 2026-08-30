# 登录/注册弹窗设计文档

**日期**: 2026-06-04  
**状态**: 已确认，待实现

---

## 一、设计目标

在博客 `apps/web` 中实现一个全功能登录/注册弹窗，支持：账号密码登录、多平台 OAuth 登录、邮箱注册。风格与主页保持一致（暖白底色、紫色 primary、玻璃态）。

---

## 二、整体结构

### 弹窗容器

| 属性   | 桌面端                                                                        | 移动端 (< `md`)                         |
| ------ | ----------------------------------------------------------------------------- | --------------------------------------- |
| 定位   | `fixed inset-0 z-[400]` 居中                                                  | 同左                                    |
| 宽度   | `max-w-[400px] w-full`                                                        | 100vw                                   |
| 高度   | 自适应内容                                                                    | `h-dvh`（铺满视口，兼容移动端虚拟键盘） |
| 圆角   | `rounded-2xl`                                                                 | `rounded-none`                          |
| 留缝   | `mx-4`                                                                        | `mx-0`，铺满全屏                        |
| 滚动   | 内容超出时可滚动（`overflow-y-auto`），返回按钮 **sticky top-0** 不随内容滚动 | 同左                                    |
| 背景   | `bg-card` + `border border-border` + `shadow-xl`                              | 同左                                    |
| 内边距 | `px-8 pt-6 pb-8`                                                              | `px-6 pt-5 pb-8`                        |

### 遮罩层

- `bg-black/45 backdrop-blur-md`
- **点击遮罩不关闭弹窗**，触发弹窗 shake 动效（`keyframes shake`，横向抖动 ~420ms）
- 弹窗只能通过左上角返回按钮关闭

---

## 三、视图：登录

### 布局（从上到下）

```
[ ← 返回按钮 ]
欢迎回来                    [ 注册 ↗ ]
请填写以下信息进行登录

[ 账号 / 邮箱 / 手机号         ]
[ 密码                    [👁] ]
                        忘记密码？

[ 继续 →                       ]

────────── 其他方式登录 ──────────

[ 微 ] [ Q ] [ G ] [ G ] [ +3 ]
```

### 各元素规格

**返回按钮（左上角）**

- 尺寸：`36×36px`，`rounded-[11px]`
- 样式：`bg-foreground/5 border border-border`，hover 加深
- 图标：`<SvgIcon name="chevron-left" size={16} />`
- 行为：登录视图 → 关闭弹窗；注册视图 → 切回登录视图

**标题行**

- 左侧：`text-[22px] font-extrabold tracking-tight`，「欢迎回来」
- 右侧：极简切换标签（见下）

**极简切换标签（注册 ↗ / ← 登录）**

- `rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold`
- 默认：`text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07]`
- hover：`text-primary bg-primary/10 border-primary/25`
- 登录视图显示「注册 ↗」，注册视图显示「← 登录」

**副标题**

- `text-[12.5px] text-muted-foreground mt-[5px]`
- 登录：「请填写以下信息进行登录」
- 注册：「填写信息完成注册」

**账号输入框**

- 全宽，`rounded-xl px-4 py-[13px] text-sm`
- 背景：`bg-foreground/5 border border-border`
- focus：`border-primary/50 bg-primary/[0.06]`
- placeholder：「账号 / 邮箱 / 手机号」

**密码输入框**

- 同账号框，右侧内嵌眼睛按钮
- 眼睛按钮：`absolute right-[10px]`，`30×30px rounded-lg`，`<SvgIcon name="eye" size={15} />` / `<SvgIcon name="eye-off" size={15} />`
- hover：`bg-foreground/7`

**忘记密码**

- `text-[11.5px] text-muted-foreground/60 text-right`，hover → `text-primary`
- 暂为占位链接，功能后续迭代

**CTA 按钮**

- 「继续」+ 右箭头图标，`mt-5 w-full h-[46px] rounded-xl`
- 样式复用 `<Button variant="default" size="lg">`
- press：`scale(0.98)`

**分割线**

- `flex items-center gap-3 text-[11.5px] text-muted-foreground`
- 两侧 `border-t border-border`，居中文字「其他方式登录」

**OAuth 图标网格**

- `flex justify-center gap-2`
- 每个图标按钮：`44×44px rounded-xl bg-foreground/5 border border-border`
- hover：`bg-foreground/9 border-foreground/14 -translate-y-px`
- hover 显示 tooltip（provider 名称）
- **显示顺序**：微信、QQ、GitHub、Google、`+3`（收起 Weibo/Gitee/Baidu）
- `+3` 按钮点击展开，行内扩展显示剩余图标（不弹新层）

---

## 四、视图：注册

### 布局

```
[ ← 返回按钮 ]
创建账号                    [ ← 登录 ]
填写信息完成注册

[ 邮箱地址                          ]
[ 验证码         ] [ 获取验证码 ]
[ 设置密码                    [👁] ]
[ 昵称（可选）                      ]
[ 个人网站（可选）                  ]
[ 👤 上传头像   可选 · JPG/PNG ≤2MB ]

[ 创建账号 →                        ]

注册即表示同意《用户协议》和《隐私政策》

────────── 其他方式注册 ──────────

[ 微 ] [ Q ] [ G ] [ G ] [ +3 ]
```

### 各元素规格

**邮箱**：同账号框，type="email"

**验证码行**：

- `flex gap-2`
- 验证码 input（`flex-1`）+ 「获取验证码」按钮
- 按钮：`rounded-xl px-[15px] bg-primary/12 border border-primary/25 text-primary text-[12.5px] font-semibold`
- 发送后进入倒计时（60s），按钮变灰不可点

**密码**：同登录视图密码框

**昵称、网站**：同账号框，placeholder 均含「可选」字样，`text-muted-foreground/40`

**头像上传区**：

- `flex items-center gap-[14px] p-[12px_16px] rounded-xl`
- `bg-foreground/[0.03] border-[1.5px] border-dashed border-foreground/[0.09]`
- hover：`bg-primary/5 border-primary/25`
- 左侧圆形预览（38px），右侧两行文字
- 上传后替换为预览图

**「创建账号」CTA**：同「继续」按钮，文字改为「创建账号」+ 右箭头

**协议提示**：

- `text-[11.5px] text-muted-foreground mt-[14px] px-[14px] py-[10px] rounded-[10px]`
- `bg-primary/[0.06] border border-primary/12`

**OAuth（注册视图底部）**：

- 分割线文字改为「其他方式注册」，其余规格与登录视图 OAuth 网格完全一致
- 复用 `<OAuthGrid />` 组件，无需重复实现

---

## 五、动效

| 触发          | 效果                            | 规格                                                                                      |
| ------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| 弹窗入场      | `slideUpCard`（已有 keyframes） | `translateY(32px)→0, opacity 0→1, 250ms ease-out`                                         |
| 遮罩点击      | pulse                           | 轻微放大再复原：`scale(1) → scale(1.018) → scale(1)`，280ms ease-in-out                   |
| 登录→注册切换 | 表单内容 slide + fade           | 登录离场 `translateX(-16px) opacity→0`，注册入场 `translateX(16px)→0 opacity→1`，各 180ms |
| 注册→登录切换 | 表单内容 slide + fade           | 注册离场 `translateX(16px) opacity→0`，登录入场 `translateX(-16px)→0 opacity→1`，各 180ms |
| 按钮 press    | scale                           | `scale(0.98)` via `data-[pressed]`                                                        |
| OAuth hover   | float                           | `translateY(-1px)`，100ms                                                                 |
| 眼睛按钮      | icon swap                       | eye ↔ eye-off，淡入淡出 150ms                                                             |

---

## 六、状态管理

**扩展现有 `useLoginModal` store**（`apps/web/store/use-login-modal.ts`）：

```ts
interface LoginModalStore {
  isOpen: boolean;
  view: "login" | "register"; // 新增
  open: (view?: "login" | "register") => void;
  close: () => void;
  setView: (view: "login" | "register") => void; // 新增
}
```

---

## 七、文件结构

```
apps/web/
  components/auth/
    login-modal.tsx          # 主弹窗组件（已存在，待重写）
    login-modal.test.tsx     # 测试（已存在，需更新）
    login-view.tsx           # 登录表单子视图（新建）
    register-view.tsx        # 注册表单子视图（新建）
    oauth-grid.tsx           # OAuth 图标网格（新建）
  store/
    use-login-modal.ts       # 扩展 view 状态
```

---

## 八、测试要求

**`login-modal.test.tsx`**：

- 默认不渲染（`isOpen=false`）
- `open()` 后渲染弹窗
- 显示登录视图默认内容
- 点击「注册 ↗」切换到注册视图
- 返回按钮：注册视图 → 返回登录；登录视图 → 关闭弹窗
- 点击遮罩不关闭（`isOpen` 仍为 true）

**`login-view.test.tsx`**、**`register-view.test.tsx`**：

- 字段渲染
- 密码可见性切换
- 表单提交（mock hook）

---

## 九、暂不实现（后续迭代）

- 忘记密码流程
- 表单实际提交（接后端 API）
- OAuth 实际跳转
- 验证码发送倒计时的后端对接
- 用户协议/隐私政策页面
