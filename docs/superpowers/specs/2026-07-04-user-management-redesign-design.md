# 用户管理模块重构设计

日期：2026-07-04
涉及仓库：blog-frontend（apps/admin, packages/api）、blog-backend

## 背景与问题

当前 admin 的「用户管理」（`apps/admin/src/modules/users/`）功能非常薄弱，且布局不合理：

- 页面顶部常驻 `AvatarNormalizeTool`（老用户头像归一化运维工具），占据大片视觉空间，但这是低频的一次性运维操作。
- 列表只有 用户/角色(管理员·VIP·普通)/在线状态/最近活跃/一个「授予-取消 VIP」按钮，没有邮箱、注册时间、账号状态等基本信息，点击行也没有详情入口。
- 搜索是假搜索：`use-admin-user-list.ts` 只在当前页已加载的 10 条里做子串匹配，翻页后关键字失效，无法搜索全量用户；`UserListReq.role_id` 在前端类型里存在但后端 `dto.UserListReq` 没有实现，形同虚设。
- 真正的用户治理能力（信任等级、禁言、封禁、批量隐藏内容）已经存在，但长在完全独立的「内容审核」模块里，入口是让管理员手动输入用户 ID 查询，和用户列表没有联动。
- `User.Status` 字段（1=正常，登录时校验 `!=1` 拒绝）在全仓库没有任何地方写入非 1 的值——「禁用账号登录」只有字段和校验逻辑，没有管理端入口。
- 没有管理员操作日志：谁在什么时候对哪个用户做了什么操作，完全无迹可查。

## 范围确认

- 内容审核模块的用户治理能力（信任等级/禁言/封禁/批量隐藏内容）整合进用户管理，审核模块只保留审核队列/全站控制/规则管理这几个跟单个用户无关的职责，原「用户治理」Tab 直接删除。
- 补上账号禁用/启用能力（复用现有 `status` 字段，无需新表）。
- 补上后端真实的关键词搜索 + 角色筛选 + 账号状态筛选（后端真分页查询，替换现在的伪搜索）。
- 补上管理员操作日志（新增 1 张表 `admin_operation_log` + 详情页一个 Tab），记录本次涉及的所有管理操作。
- 角色管理不做通用化：目前只保持单管理员，不新增「提升为管理员」的 UI，VIP 授予/撤销维持现状。
- 不做批量操作（多选批量封禁等）：博客级别用户量不大，逐个操作足够，批量操作收益低风险高。
- 头像归一化工具拆分：单用户处理挪进用户详情页的「头像」Tab；全局批量处理挪到新的 `/users/tools`（无侧边栏入口，仅从用户管理页头部一个「工具」按钮跳转）。

## 一、整体页面结构

```
用户管理（/users）
├─ 页头：标题 + 刷新 + 「工具」入口（跳转 /users/tools）
├─ 工具栏：搜索框（用户名/昵称/邮箱，后端全量搜索）+ 角色筛选 + 账号状态筛选 + 处罚状态筛选
├─ 用户表格（服务端分页/筛选）
│   列：用户（昵称+#id+用户名）｜ 角色 ｜ 账号状态 ｜ 内容状态 ｜ 最近活跃 ｜ 操作（查看详情）
└─ 点击行 / "查看详情" → 打开用户详情弹层

/users/tools（无侧边栏入口，仅从用户管理页头部跳转）
└─ 全站头像归一化批量处理（原 AvatarNormalizeTool 的「处理全部」部分）
```

「账号状态」「内容状态」两列都是新增：账号状态对应新补的禁用能力（正常/已禁用）；内容状态对应已有的 `user_moderation_profile.sanction_state`（正常/禁言/封禁），列表里直接可见，不用再跳去审核模块查。

## 二、用户详情弹层（Modal + Tabs）

点击列表行打开，复用 `@repo/ui` 的 `Modal` + `Tabs`（与 `ModerationPage.tsx` 现有用法一致）：

```
用户详情 #<id> · <昵称>
├─ Tab 基本信息（只读）
│   用户名、邮箱(+验证状态)、手机号、注册时间、最近登录/活跃、个人简介、社交链接
│   不做资料编辑——编辑资料是用户自己在前台做的事，管理端只读展示
├─ Tab 角色与账号
│   角色 badge 展示（管理员/VIP/普通）
│   VIP 授予/撤销按钮（沿用现有 grantVipRole/revokeVipRole 接口）
│   账号状态：正常/已禁用 + 禁用/启用按钮（新能力）
├─ Tab 内容治理（原 ModerationUserPanel 搬入，去掉手动输入 ID 的部分）
│   信任等级查看/修正、禁言、封禁、解除处罚、按游标批量隐藏/恢复该用户内容
│   直接复用现有 use-moderation-user 的表单/校验逻辑，改为以详情页当前 userId 自动加载，不再有 ID 输入框
├─ Tab 头像
│   单用户头像归一化检查 + 清除头像（原 AvatarNormalizeTool 单用户部分逻辑）
└─ Tab 操作日志（新）
    时间线：谁在什么时候对该用户做了什么操作（授予VIP/禁用/封禁/禁言…），分页展示
```

## 三、后端设计

只新增 **1 张表**（操作日志），其余是接口/查询逻辑扩展，不涉及其它 schema 变更。

### 3.1 列表查询扩展

- 新增管理端专属列表：`GET /admin/users`（区别于公开的 `GET /users`，避免公开接口暴露账号状态等敏感筛选维度）。
- `dto.AdminUserListReq` 新增字段：
  - `keyword string`：匹配 `username`/`nickname`/`email`（`LIKE`）
  - `role string`：`ROLE_ADMIN` / `ROLE_VIP` / `ROLE_NORMAL` / 空
  - `status string`：`active` / `disabled` / 空
- `repository.ListAll` 现在硬编码 `WHERE status = 1`，管理端列表要去掉这个限制（管理员需要看到被禁用的账号），改为可选的 `status` 过滤条件；`keyword`/`role` 转成动态 `WHERE`/`JOIN` 条件追加到现有的角色权重排序查询上。
- 新增 `dto.AdminUserListItemResp`：在公开 `UserListItemResp` 基础上多带 `email`、`status`、`sanction_state`（`LEFT JOIN user_moderation_profile`，无记录时视为 `active`）。

### 3.2 用户详情

- 新增 `GET /admin/users/:id`：聚合 `User` + `Roles` + `UserMeta` + `UserModerationProfile` + 点赞数/碎语数（复用现有 `CountLikedContent`/`CountByUser` 逻辑），返回新的 `dto.AdminUserDetailResp`。
- 与公开的 `GET /users/:id`（`UserPublicProfileResp`）的区别：管理端返回真实邮箱/手机号（不脱敏），额外带 `status`、`password_set`、`email_verified`、审核画像摘要。

### 3.3 账号禁用/启用（新能力）

- 新增 `POST /admin/users/:id/disable`、`POST /admin/users/:id/enable`。
- Service 校验：
  - 不能禁用当前操作人自己。
  - 不能禁用系统里最后一个持有 `ROLE_ADMIN` 的账号（查询持有 admin 角色的用户数，`<=1` 时拒绝）。
- 复用现有 `Status` 字段语义：`middleware/auth.go`、`service/auth/auth.go` 已经在校验 `status != 1` 时拒绝登录/刷新 token，禁用只需把该字段更新为 0，不需要改动登录链路。

### 3.4 操作日志（新表）

新表 `admin_operation_log`：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint pk | |
| operator_id | uint | 操作人（管理员）ID |
| target_user_id | uint | 被操作的目标用户 ID |
| action | varchar(32) | 操作类型枚举 |
| detail | json，可空 | 操作详情（如禁用原因、封禁理由与到期时间） |
| created_at | datetime | |

`action` 枚举：`grant_vip` / `revoke_vip` / `disable_account` / `enable_account` / `mute` / `ban` / `release` / `update_trust_level` / `clear_avatar`。

在现有 VIP 授予/撤销、moderation 的 mute/ban/release/updateProfile、新的 disable/enable、头像清除接口里各补一行写入，属于小改动，不影响主业务流程（写入失败不应回滚主操作，记录为尽力而为）。

新增 `GET /admin/users/:id/operation-logs`（分页），供详情页「操作日志」Tab 使用。

### 3.5 内容审核模块

- 后端 moderation 相关 handler/service **不改**，mute/ban/release/updateUserProfile 接口原样保留，只是前端调用入口从「内容审核」页搬到「用户管理」详情页。
- 前端 `ModerationPage.tsx` 删除「用户治理」Tab 及 `ModerationUserPanel`、`use-moderation-user` 里手动输入 ID 查询的部分（保留其余审核队列/控制/规则逻辑不变）。

## 四、前端设计

### 4.1 类型与 API 客户端（packages/api）

新增/调整 `packages/api/src/types/user.ts`：
- `AdminUserListReq`（keyword/role/status/page/page_size）
- `AdminUserListItemResp`、`AdminUserPageResp`
- `AdminUserDetailResp`
- `AdminOperationLogItemResp`、`AdminOperationLogPageResp`

`client.ts` 的 `users` 域新增方法：
- `listAdmin(req: AdminUserListReq)` → `GET /admin/users`
- `getAdminDetail(id)` → `GET /admin/users/:id`
- `disableAccount(id)` / `enableAccount(id)` → `POST /admin/users/:id/disable|enable`
- `getOperationLogs(id, req)` → `GET /admin/users/:id/operation-logs`

`grantVipRole`/`revokeVipRole`/`normalizeAvatars`/`clearUserAvatar` 保持不变。

### 4.2 apps/admin 模块改动（`src/modules/users/`）

- `UsersPage.tsx`：移除顶部常驻 `AvatarNormalizeTool`；工具栏加角色/状态筛选（复用 `AdminListToolbar` 的 `filters` 插槽，模式与 `MomentListToolbar` 一致）；表格加账号状态/内容状态列；行点击打开详情弹层。
- `model.ts`：query codec 从「仅 page+search」扩展为 page+filters（search/role/status），参照 `moments/model.ts` 的 `AdminMomentListQueryState` 写法。
- `hooks/use-admin-user-list.ts`：改为调用新的 `apiClient.users.listAdmin`，筛选条件作为请求参数，不再本地过滤。
- 新增 `components/UserDetailModal.tsx` + `hooks/use-user-detail.ts`：承载 5 个 Tab；「内容治理」Tab 内部复用/迁移 `ModerationUserPanel` 的表单渲染逻辑（去掉 ID 输入框，改为受控 userId）。
- `components/AvatarNormalizeTool.tsx` 拆分：抽出可复用的单用户处理片段供详情页「头像」Tab 使用；保留的整页组件搬到新路由。
- 新增 `UserToolsPage.tsx` + `module.tsx` 中追加一条**无 nav** 的路由 `{ path: "/users/tools", element: <UserToolsPage /> }`（同一个 `usersModule` 内追加路由项即可，不需要单独注册模块）。

### 4.3 内容审核模块改动（`src/modules/moderation/`）

- `ModerationPage.tsx` 删除 `user` Tab 及相关 state（`rulesTabVisited` 逻辑不受影响）。
- 删除 `ModerationUserPanel.tsx`、`ModerationUserSummary.tsx`（若详情页迁移后复用其展示片段，则保留并移动到 `users` 模块下，避免跨模块引用私有组件）。
- `use-moderation-user.ts` 的加载/更新逻辑迁移到 `users` 模块的新 hook，去掉「手动输入 ID 查询」相关状态。

### 4.4 测试

按 AGENTS.md 强制要求，每个改动文件同步测试：
- 后端：`service/user`、`repository/user`、`handler/user` 新增/调整用例覆盖列表筛选、详情聚合、禁用校验（自己/最后一个管理员）、操作日志写入。
- 前端：`UsersPage.test.tsx`、`use-admin-user-list.test.ts`、新增的 `UserDetailModal.test.tsx`、`use-user-detail.test.ts`、`UserToolsPage.test.tsx`；`ModerationPage.test.tsx` 同步删除对应 Tab 的断言。
- `src/config/modules.test.ts` 检查新增子路由不破坏「路由 path 唯一」等约束。

## 五、不做的事（明确排除）

- 不做批量操作（多选批量封禁/批量 VIP）。
- 不做通用角色编辑器（提升为管理员等）；只保留 VIP 开关。
- 不做用户资料编辑（昵称/简介等由用户自己在前台改）。
- 不做用户导出（CSV 等）。
- 不新建自定义权限点/RBAC 体系，沿用现有 `ROLE_ADMIN`/`ROLE_VIP`/`ROLE_NORMAL` 三角色。
