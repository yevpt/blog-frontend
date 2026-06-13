# 用户详情页 — Codex 实现交接文档

> **背景**：该任务由 Claude Code 完成设计，因额度用尽交接给 Codex 实现。  
> **设计规范**：`docs/superpowers/specs/2026-06-13-user-profile-page-design.md`（必读）  
> **视觉 mockup**：`.superpowers/brainstorm/95075-1781340149/content/full-design.html`（在浏览器打开可交互）

---

## 一、项目技术栈

| 技术 | 说明 |
|------|------|
| Next.js App Router | Server Components 默认，只有需要 hooks/浏览器 API 时加 `'use client'` |
| TypeScript | 严禁 `any`，用精确 interface/type |
| TailwindCSS | 唯一样式方案，条件类名用 `clsx` 或 `tailwind-merge` |
| `@repo/ui` | 项目 UI 组件库（Button、Input、Avatar、Modal、Tabs 等） |
| `@repo/icons` | 图标库，用 `<SvgIcon name="..." />` —— **禁止内联 SVG 或引入第三方图标库** |
| `@repo/api` | API 客户端，`createApiClient()` / `createServerApiClient()` |
| Zustand | 全局客户端状态（auth store） |
| Vitest + Testing Library | 单元测试，组件/Hook/页面均需同目录测试文件 |

**关键约束**：
- `apps/web/` 下不得自建基础 UI 组件，统一从 `@repo/ui` 引入
- 响应式：移动端优先，`base → sm → md → lg`
- 每个新组件和页面旁必须有 `*.test.tsx`

---

## 二、现有可复用代码

### 关键文件路径

```
apps/web/
  components/
    common/
      user-avatar.tsx          # UserAvatar 组件（含 fallback）
      base-user-card.tsx       # BaseUserCard（在线状态、角色徽章逻辑）
  lib/
    server-api.ts              # createServerApiClient()
  app/
    circle/
      _components/user-card.tsx  # 参考卡片布局
    friend-links/
      page.tsx                 # 参考 Server Component + PageContainer 模式

packages/
  ui/src/
    input/input.tsx            # Input 组件（ring 边框、leading/trailing icon）
    button.tsx                 # Button（variant: default/outline/ghost/text）
    avatar/avatar.tsx          # Avatar 基础组件
    tabs.tsx                   # Tabs 组件
  api/src/
    types/user.ts              # UserDetailResp、UserMetaResp、UserSettingResp
    client.ts                  # api.users.getMe()、api.users.listPublic()
  icons/svg/                   # 现有图标列表（见下方）
```

### 现有 icons（`packages/icons/svg/`）

```
edit.svg  github.svg  gitee.svg  wechat.svg  weibo.svg  qq.svg
user.svg  image.svg   eye.svg    eye-off.svg  check.svg  close.svg
link.svg  bell.svg    log-out.svg  pen.svg    plus.svg
```

**需要新增的图标**（将对应 SVG 放入 `packages/icons/svg/`，然后运行 `pnpm --filter @repo/icons build`）：

```
bilibili.svg    zhihu.svg    phone.svg
gender.svg      birthday.svg shield.svg    camera.svg
```

参考源：`/Volumes/External/SynologyDrive/Codes/Vpt/yevpt-ssr/assets/icon/svg/`  
其中已有：`bili.svg` `zhihu.svg` `gender.svg` `age.svg` `call.svg`（可直接复制改名）

---

## 三、API 现状与缺口

### 现有 API 方法（`packages/api/src/client.ts`）

```typescript
api.users.getMe()          // GET /users/me — 当前登录用户完整信息（含 meta、setting、social_links）
api.users.listPublic(req)  // GET /users — 公开用户列表
```

### 需要后端新增的 API（前端需先确认后端是否已有，否则 mock 占位）

```
GET  /users/:id                  # 按 ID 获取某个用户的公开详情（UserDetailResp 的公开子集）
PATCH /users/me/profile          # 更新昵称、身份标签、简介等基本信息
PATCH /users/me/meta             # 更新性别、生日等 meta 字段
PATCH /users/me/social/:platform # 更新或删除某个社交链接
PATCH /users/me/avatar           # 更新头像
PATCH /users/me/username         # 修改用户名（成功后需重新登录）
PATCH /users/me/password         # 修改密码（成功后需重新登录）
GET  /users/me/oauth-bindings    # 获取 OAuth 绑定列表
DELETE /users/me/oauth/:provider # 解绑 OAuth
POST /users/me/email/main        # 修改主邮箱
POST /users/me/email/sub         # 设置副邮箱
PATCH /users/me/email/display    # 设置对外展示邮箱（main/sub/none）
```

**如果后端 API 未就绪**，在 `apps/web/app/_mock/` 目录添加 mock 数据，并在组件内条件引入。

---

## 四、数据类型扩展

在 `packages/api/src/types/user.ts` 补充以下类型：

```typescript
/** GET /users/:id — 某用户的公开详情 */
export interface UserPublicProfileResp {
  id: number;
  nickname: string;
  avatar_url: string | null;
  mark: string | null;           // 身份标签
  description: string | null;   // 个人简介
  last_login_at: string | null;
  register_at: string;
  roles: string[];
  display_email: string | null; // 按展示设置过滤后的邮箱，null = 不展示
  site: string | null;
  social_links: UserSocialLinkResp[];
  // meta 字段（仅部分公开）
  gender: string | null;
  birthday: string | null;      // "YYYY-MM-DD"
}

/** PATCH /users/me/email/display */
export type EmailDisplaySetting = 'main' | 'sub' | 'none';

/** GET /users/me/oauth-bindings */
export interface OAuthBindingResp {
  provider: string;   // "google" | "github" | "qq" 等
  bound: boolean;
  bound_at?: string;
}
```

---

## 五、目录结构（待创建）

```
apps/web/app/users/
  [id]/
    page.tsx                       # Server Component：获取用户数据，传给客户端组件
    page.test.tsx
    _components/
      user-profile-page.tsx        # Client Component：顶层，管理 isEditMode 状态
      user-profile-page.test.tsx
      user-banner.tsx              # Banner 渐变 + 编辑模式遮罩
      user-banner.test.tsx
      user-info-header.tsx         # 头像、昵称（含行内编辑）、身份标签、简介、社交图标行
      user-info-header.test.tsx
      user-profile-tabs.tsx        # Tab 切换：资料/碎语/点赞/账号安全
      user-profile-tabs.test.tsx
      profile-tab/
        profile-tab.tsx            # 资料 Tab 内容
        profile-tab.test.tsx
        field-row.tsx              # ⭐ 核心复用单元：单字段只读+编辑态
        field-row.test.tsx
      security-tab/
        security-tab.tsx           # 账号安全 Tab
        security-tab.test.tsx
        oauth-binding-list.tsx
      skeleton/
        user-profile-skeleton.tsx  # 初始加载骨架屏
        user-profile-skeleton.test.tsx
```

---

## 六、核心组件接口设计

### `FieldRow`（最重要的复用单元）

```tsx
interface FieldRowProps {
  label: string;
  value: string | null;
  isEditMode: boolean;        // 全局编辑模式开关
  isOwner: boolean;           // 是否本人（非本人不显示编辑入口）
  emptyText?: string;         // 空值时的「+ 添加」文案，不传则只读时隐藏该行
  onSave: (value: string) => Promise<void>;  // 保存回调，抛错则显示错误
  validate?: (value: string) => string | null;  // 前端校验，返回错误文字
  inputType?: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select';
  selectOptions?: { label: string; value: string }[];  // inputType=select 时用
}
```

**渲染逻辑**：
1. `!isEditMode || !isOwner`：只读行（`value` 为空且无 `emptyText` 则 `display:none`）
2. `isEditMode && isOwner && !isActiveEditing`：显示值 + 右侧铅笔图标
3. `isEditMode && isOwner && isActiveEditing`：显示输入框 + 内嵌 ✓ / ✕ 图标

**同一时刻只能有一个字段激活**：由父组件 `ProfileTab` 持有 `activeField: string | null`，向下传 `isActiveEditing` 和 `onActivate(fieldName)` / `onDeactivate()` 回调。

### `UserProfilePage`（顶层状态管理）

```tsx
// 全局编辑模式状态在此持有
const [isEditMode, setIsEditMode] = useState(false);
// 切换编辑模式时若有字段正在编辑，先取消
```

---

## 七、页面可见性规则总结

| 元素 | 访客 | 本人（只读） | 本人（编辑模式） |
|------|------|-------------|----------------|
| Banner 遮罩「更换背景」 | ✗ | ✗ | ✓ |
| 头像遮罩 | ✗ | ✗ | ✓ |
| 「编辑个人资料」按钮（蓝） | ✗ | ✓ | ✗ |
| 「退出编辑」按钮（红） | ✗ | ✗ | ✓ |
| 字段铅笔图标 | ✗ | ✗ | ✓ |
| Tab：碎语、点赞 | ✓ | ✓ | ✗ |
| Tab：账号安全 | ✗ | ✗ | ✓（编辑模式才显示） |
| 空字段行 | ✗ | ✗ | ✓（显示「+ 添加」） |
| 社交账号区块（列表底部） | ✗ | ✗ | ✓ |
| 联系邮箱（只读） | ✓（展示邮箱） | ✓ | ✗ |
| 主/副邮箱（编辑） | ✗ | ✗ | ✓ |
| 昵称铅笔图标 | ✗ | ✗ | ✓ |

---

## 八、骨架屏要求

两个场景需要骨架屏：

1. **初始进入页面**：`page.tsx` 创建 `loading.tsx`，或在 `UserProfilePage` 内根据数据加载状态展示 `UserProfileSkeleton`
2. **切换编辑模式**时若需要额外请求（如 OAuth 绑定列表），相应区块显示行级 skeleton

骨架屏使用 `@repo/ui` 的 `Skeleton` 组件（如果没有则用 `animate-pulse` + `bg-muted rounded`）。

---

## 九、编辑保存反馈

```
保存中  → ✓ 按钮 disabled + loading spinner（可选）
成功   → ✓ 按钮短暂变绿色（#22c55e），800ms 后自动收回只读态，无 toast
失败   → ✓ 按钮变红，行内输入框下方显示错误文字
前端校验错误 → ring-destructive + 行内红色提示，✓ 按钮 disabled
```

---

## 十、实现顺序建议

按以下顺序实现，每步都能独立运行：

1. **新增图标** → 复制 SVG 文件，运行 `pnpm --filter @repo/icons build`
2. **扩展 API 类型** → `packages/api/src/types/user.ts` 补充类型
3. **页面骨架** → `app/users/[id]/page.tsx` + `loading.tsx`，先渲染静态内容
4. **UserBanner** → Banner + 头像 + 在线状态，不含编辑
5. **UserInfoHeader** → 昵称、身份标签、简介、社交图标行，不含编辑
6. **ProfileTab 只读** → FieldRow 只读态 + 正确的显示/隐藏逻辑
7. **编辑模式开关** → UserProfilePage 的 `isEditMode` 状态，按钮切换
8. **FieldRow 编辑态** → 铅笔图标 + 输入框 + 保存/取消，含 onSave 回调
9. **昵称行内编辑** → UserInfoHeader 内昵称的编辑态
10. **账号安全 Tab** → 用户名/密码修改 + OAuth 绑定列表 + 邮箱管理
11. **骨架屏** → UserProfileSkeleton + loading.tsx

---

## 十一、测试最低覆盖要求

每个组件测试文件需覆盖：
- 渲染不崩溃
- `isOwner=false` 时不显示编辑入口
- `isEditMode=true` 时显示铅笔图标
- 空字段在只读时隐藏，编辑模式时显示「+ 添加」
- 保存成功 / 失败的 UI 状态变化（mock `onSave` prop）

---

## 十二、参考旧版实现

旧版 Vue 组件路径（仅供参考逻辑，不要照搬代码风格）：

```
/Volumes/External/SynologyDrive/Codes/Vpt/yevpt-ssr/components/user/
  user-top.vue              # 头像、昵称、简介、编辑按钮
  user-edit-item.vue        # 字段级编辑单元（对应新版 FieldRow）
  user-detail-info.vue      # 只读信息列表
  user-edit-info.vue        # 编辑模式信息列表
  user-edit-security.vue    # 账号安全
  user-edit-info/           # 各字段子组件
```
