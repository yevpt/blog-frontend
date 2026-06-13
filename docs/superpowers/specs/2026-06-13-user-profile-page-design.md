# 用户详情页设计规范

**日期：** 2026-06-13  
**路由：** `/users/[id]`  
**状态：** 待实现

---

## 一、页面概述

点击任意用户头像进入该用户的详情页。访客只读；本人访问时额外显示编辑能力。

---

## 二、整体布局

**Banner 式（A 方案）**：顶部渐变 Banner + 头像浮层，类似 GitHub Profile。

```
┌─────────────────────────────────┐
│         Banner（固定渐变色）       │  110px，violet→indigo 渐变
│         右上角：在线状态浮层        │
├─────────────────────────────────┤
│ 头像  昵称  身份标签               │
│       个人简介                    │
│       社交图标行                  │
│  [编辑个人资料] / [退出编辑]（本人）│
├─────────────────────────────────┤
│  Tabs：资料 / 碎语 / 点赞          │  访客可见
│  （编辑模式下额外显示：账号安全）    │  仅本人
├─────────────────────────────────┤
│  Tab 内容区                       │
└─────────────────────────────────┘
```

### Banner
- 固定渐变色，与项目 primary（violet `#7c3aed`）一致，暂不支持上传
- 编辑模式下叠加半透明遮罩 + 「📷 点击更换背景」提示（预留后续上传能力，当前点击无效）
- 右上角在线状态浮层：距上次登录 < 3 分钟显示「● 在线」，否则显示「N 分钟前来过」

### 头像
- 默认显示用户头像或昵称首字母 fallback
- 编辑模式下叠加半透明遮罩 + 相机图标，点击触发头像上传

### 社交图标行（顶部，只读）
- 只展示**社交平台**图标（Github、Gitee、Bilibili、知乎、微博、QQ、微信等）
- **不包含**个人站点和邮箱（这两项在下方资料列表展示）
- 只展示用户已填写的平台，点击图标跳转对应链接/复制联系方式

---

## 三、Tab 结构

| Tab | 可见性 | 说明 |
|-----|--------|------|
| 资料 | 所有人 | 用户基本信息，见第四节 |
| 碎语 | 所有人 | 用户的碎语列表 |
| 点赞 | 所有人 | 用户点赞的内容 |
| 账号安全 | **仅本人** | 修改密码/用户名、OAuth 绑定、邮箱管理 |

**编辑模式下**：隐藏「碎语」和「点赞」Tab，只显示「资料」和「账号安全」。

---

## 四、资料 Tab 内容

### 只读模式

以下字段**按区块分组展示**，**未填写的字段不显示**：

**基本信息**（身份标签和个人简介已在顶部展示，此处不重复）
- 性别
- 生日（附星座）

**联系方式**
- 联系邮箱：显示用户在账号安全中配置的「对外展示邮箱」（主邮箱/副邮箱/不展示，三选一）
- 个人站点

社交账号区块在只读模式下**不在列表中重复展示**（已在顶部图标行体现）。

### 编辑模式

编辑模式下额外显示所有可编辑字段（含空字段，显示「+ 添加」入口）：

**基本信息**
- 昵称（在顶部用户名行旁边触发，见第五节）
- 身份标签
- 个人简介

**联系方式**
- 主邮箱（跳转到账号安全 Tab 修改）
- 副邮箱
- 个人站点
- 联系电话

**社交账号**
- Github、Gitee、微信、QQ、Bilibili、知乎、微博（sina）

---

## 五、编辑模式交互

### 进入 / 退出
- 本人访问时，顶部用户信息区显示蓝紫色「编辑个人资料」按钮
- 点击后进入编辑模式：按钮变为红色「退出编辑」，无全局保存按钮
- 退出编辑时如有字段处于激活编辑态，自动取消并恢复原值

### 字段级编辑（Field-level editing）
- 编辑模式下，每个可编辑字段行右侧出现铅笔图标 ✏
- 点击铅笔图标：该字段原地切换为输入态，输入框右侧内嵌保存 ✓ 和取消 ✕ 图标按钮
- **同一时刻只能有一个字段处于激活编辑态**，激活新字段前自动取消当前编辑
- 输入框样式对齐项目 `@repo/ui` Input 组件：`ring-1 ring-gray-300`，激活 `ring-2 ring-primary`，错误 `ring-2 ring-destructive`，`rounded-lg`

**昵称编辑**：昵称显示在顶部用户名行，编辑模式下在昵称旁出现铅笔图标，激活后在原位展开输入框（不进入列表区）。

### 字段保存反馈
- 保存成功：✓ 按钮短暂变绿色约 800ms，自动收回至只读行，**无 toast**
- 保存失败：✓ 按钮变红，行内输入框下方显示错误文字提示
- 验证错误（前端）：`ring-destructive` + 行内红色小字提示，保存按钮置灰

### 骨架屏（Skeleton）
- **初始进入页面**：展示骨架屏直到用户数据加载完成（Banner 区、头像、昵称、资料列表均有 skeleton 占位）
- **切换编辑模式**：切换瞬间若需要加载额外数据（如 OAuth 绑定列表），相应区块显示 skeleton 过渡

---

## 六、账号安全 Tab

仅本人可见，包含：

**登录凭证**
- 用户名：显示当前用户名，点击「修改」触发字段级编辑（修改成功后需重新登录）
- 登录密码：显示「已设置」，点击「修改」触发字段级编辑（修改成功后需重新登录）

**第三方绑定**
- 列出所有支持的 OAuth 提供商（Google、Github、QQ 等）
- 已绑定：显示绿色「已绑定」badge + 「解绑」按钮
- 未绑定：显示「未绑定」badge + 「绑定」按钮（跳转 OAuth 授权流程）

**邮箱管理**
- 主邮箱：当前主邮箱（脱敏显示），点击「修改」
- 副邮箱：未设置时显示「添加」
- 对外展示邮箱：下拉选择「主邮箱 / 副邮箱 / 不展示」，影响资料 Tab 的「联系邮箱」展示

---

## 七、路由与权限

| 场景 | 行为 |
|------|------|
| 访客访问 `/users/[id]` | 只读，不显示编辑按钮、账号安全 Tab、字段铅笔图标 |
| 本人访问 `/users/[id]` | 显示编辑按钮、账号安全 Tab |
| 未登录访问 | 可查看只读页面（公开信息） |

---

## 八、组件拆分（建议）

```
apps/web/app/users/
  [id]/
    page.tsx                  # Server Component，获取用户数据
    _components/
      user-profile-page.tsx   # Client Component，编辑模式状态管理
      user-banner.tsx         # Banner + 头像区域
      user-info-header.tsx    # 昵称、身份标签、简介、社交图标
      user-tabs.tsx           # Tab 切换
      profile-tab/
        profile-tab.tsx       # 资料 Tab 内容
        field-row.tsx         # 单字段行（只读 + 编辑态）
      security-tab/
        security-tab.tsx      # 账号安全 Tab 内容
      skeleton/
        user-profile-skeleton.tsx  # 初始加载骨架屏
```

`field-row.tsx` 是核心复用单元：接收 `label`、`value`、`isEditMode`、`onSave` props，内部管理激活/保存/取消状态。

---

## 九、数据模型

```typescript
interface UserProfileData {
  // 基本（公开）
  id: string | number;
  nickname: string;
  avatar_url: string | null;
  mark: string | null;          // 身份标签
  description: string | null;   // 个人简介
  last_login_at: string | null;
  register_at: string;
  roles: string[];

  // 联系方式（公开，按展示设置过滤）
  display_email: string | null; // 后台选择对外展示的邮箱
  site: string | null;

  // 社交账号（公开，仅已填写）
  github: string | null;
  gitee: string | null;
  bilibili: string | null;
  zhihu: string | null;
  weibo: string | null;
  qq: string | null;
  wechat: string | null;

  // 仅本人可见
  meta?: {
    email: string | null;       // 主邮箱
    sub_email: string | null;   // 副邮箱
    email_show: 'main' | 'sub' | 'none'; // 对外展示选择
    phone: string | null;
    gender: '1' | '0' | null;
    birthday: string | null;
  };
  username?: string;            // 仅本人可见
}
```

---

## 十、需要的新图标

以下图标需添加到 `packages/icons/svg/`：

- `bilibili.svg`
- `zhihu.svg`
- `gitee.svg`（已有）
- `weibo.svg`（已有）
- `qq.svg`（已有）
- `phone.svg`
- `gender.svg`
- `birthday.svg`（或复用现有 calendar）
- `shield.svg`（账号安全区块图标）
