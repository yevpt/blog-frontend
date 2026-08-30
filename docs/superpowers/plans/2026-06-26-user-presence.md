# 用户 Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将用户「在线 / 最近活跃」与 Analytics 心跳打通：`collect` 维护 Redis `user:online` + 节流写 `last_active_at`；登录双写两时间戳并即时上线；前端改读 `is_online` / `last_active_at`。

**Architecture:** 认证域（`last_login_at`）与活跃域（`last_active_at` + `user:online`）分离。`PresenceService` 挂在 analytics collect 编排与 auth/oauth 登录路径；用户列表/详情 API batch 查 Redis 填 `is_online`。Spec：`docs/superpowers/specs/2026-06-26-user-presence-design.md`。

**Tech Stack:** Go/Gin/GORM/MySQL/go-redis（blog-backend）；Next.js 16 / React 19 / Vitest（blog-frontend / @repo/api）。

## Global Constraints

- 在线窗口 **90s**，与 `analytics.online_window` 共用 config，禁止前端自行用时间差判在线。
- collect 仅在 `user_id != nil && !is_bot && !is_suspect` 时刷新 presence。
- `last_active_at` DB 写节流 **60s**（Redis key `user:presence:db_touch:{uid}`）。
- 登录必须**单条 SQL** 双写 `last_login_at` + `last_active_at`，并 `ZADD user:online`。
- 现有库必须执行 `migrations/20260626_user_last_active_at.sql`（含回填）。
- 废弃并删除 `POST /users/me/login-time` 路由及 `RecordLogin` service/handler。
- 离线文案：「X 前活跃过」；无记录：「从未活跃」。
- 测试强制：改后端 service → `*_test.go`；改前端组件 → `*.test.tsx`。
- 提交信息：Conventional Commits 中文 subject；合并 main 仅 `git merge --ff-only`。

---

## File Structure

### blog-backend

| 文件                                          | 职责                                                                |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `migrations/20260626_user_last_active_at.sql` | 增量 DDL + 历史回填                                                 |
| `internal/model/user.go`                      | `LastActiveAt` 字段                                                 |
| `internal/repository/user/user.go`            | `TouchLoginPresence`、`UpdateLastActiveAt`、排序改 `last_active_at` |
| `internal/service/analytics/presence.go`      | `Presence` 接口与实现                                               |
| `internal/service/analytics/presence_test.go` | presence 单测                                                       |
| `internal/service/analytics/collect.go`       | 注入 presence，Handle 内 Touch                                      |
| `internal/service/analytics/collect_test.go`  | 补 authenticated presence 用例                                      |
| `internal/worker/analytics/rollup.go`         | Cleanup 裁剪 `user:online`                                          |
| `internal/service/auth/auth.go`               | 登录改调 `TouchLoginPresence` + `TouchUserOnline`                   |
| `internal/service/oauth/oauth.go`             | 同上                                                                |
| `internal/dto/user.go`                        | DTO 增 `last_active_at`、`is_online`                                |
| `internal/service/user/detail.go`             | assemble/buildPublicProfile 透传字段                                |
| `internal/service/user/user.go`               | 列表 enrichment、删 `RecordLogin`                                   |
| `internal/service/user/presence_enrich.go`    | **新建** batch `is_online` 填充                                     |
| `internal/router/router.go`                   | 接线 Presence、删 login-time 路由                                   |
| `internal/handler/user/user.go`               | 删 `RecordLogin` handler                                            |

### blog-frontend

| 文件                                                       | 职责                            |
| ---------------------------------------------------------- | ------------------------------- |
| `packages/api/src/types/user.ts`                           | 类型增字段                      |
| `apps/web/lib/user-presence.ts`                            | `resolvePresenceDisplay` 纯函数 |
| `apps/web/lib/user-presence.test.ts`                       | 展示逻辑单测                    |
| `apps/web/components/common/base-user-card.tsx`            | 改用 presence                   |
| `apps/web/components/common/base-user-card.test.tsx`       | 更新断言                        |
| `apps/web/app/users/[id]/_components/user-banner.tsx`      | 同上                            |
| `apps/web/app/users/[id]/_components/user-info-header.tsx` | 同上                            |
| `apps/web/app/users/[id]/_components/user-banner.test.tsx` | 更新                            |
| `apps/web/app/page.tsx`                                    | 去掉 `isOnline: false` 硬编码   |

---

### Task 1: DB 迁移 + Model

**Files:**

- Create: `blog-backend/migrations/20260626_user_last_active_at.sql`
- Modify: `blog-backend/internal/model/user.go`
- Modify: `blog-backend/README.md`（部署小节补一句：上线跑此 migration）

**Interfaces:**

- Produces: `model.User.LastActiveAt *time.Time`

- [ ] **Step 1: 写 migration SQL**

`blog-backend/migrations/20260626_user_last_active_at.sql`：

```sql
-- 2026-06-26: 用户最近活跃时间 + 历史数据回填
ALTER TABLE `user`
  ADD COLUMN `last_active_at` datetime NULL COMMENT '最后活跃时间' AFTER `last_login_at`;

UPDATE `user`
SET `last_active_at` = `last_login_at`
WHERE `last_active_at` IS NULL AND `last_login_at` IS NOT NULL;
```

- [ ] **Step 2: Model 增字段**

```go
LastActiveAt *time.Time `gorm:"comment:最后活跃时间" json:"last_active_at"`
```

- [ ] **Step 3: 本地验证**

```bash
cd blog-backend
# 已有库：手动执行 migration SQL
# 新库：
make dbsetup
go test ./internal/repository/user/... -run TestNonExistent -count=0  # 编译通过即可
```

- [ ] **Step 4: Commit**

```bash
git add migrations/20260626_user_last_active_at.sql internal/model/user.go README.md
git commit -m "feat(user): 新增 last_active_at 字段与增量迁移脚本"
```

---

### Task 2: Repository 登录双写 + 排序

**Files:**

- Modify: `blog-backend/internal/repository/user/user.go`
- Modify: `blog-backend/internal/repository/user/user_test.go`
- Regenerate: `blog-backend/internal/repository/user/mock/mock_user_repository.go`（若接口变更）

**Interfaces:**

- Produces:
  - `TouchLoginPresence(userID uint) error` — 单 SQL `last_login_at=NOW(), last_active_at=NOW()`
  - `UpdateLastActiveAt(userID uint) error`
- Consumes: 无

- [ ] **Step 1: 写失败测试**

```go
func TestUserRepo_TouchLoginPresence(t *testing.T) {
	// sqlmock: UPDATE user SET last_login_at=NOW(), last_active_at=NOW() WHERE id=?
}

func TestUserRepo_ListRecent_OrdersByLastActiveAt(t *testing.T) {
	// 断言 ORDER BY COALESCE(last_active_at, ...) DESC
}
```

- [ ] **Step 2: 实现 TouchLoginPresence**

```go
func (r *userRepo) TouchLoginPresence(userID uint) error {
	return r.db.Model(&model.User{}).Where("id = ?", userID).
		Updates(map[string]any{
			"last_login_at":  gorm.Expr("NOW()"),
			"last_active_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *userRepo) UpdateLastActiveAt(userID uint) error {
	return r.db.Model(&model.User{}).Where("id = ?", userID).
		Update("last_active_at", gorm.Expr("NOW()")).Error
}
```

- [ ] **Step 3: ListRecent / ListAll 排序**

```go
Order("COALESCE(last_active_at, created_at) DESC, id DESC")
// ListAll 角色权重行改为 last_active_at
Order(roleWeightExpr + " ASC, COALESCE(user.last_active_at, user.created_at) DESC, user.id DESC")
```

- [ ] **Step 4: 跑测试**

```bash
cd blog-backend
go test ./internal/repository/user/... -v -run 'TouchLoginPresence|ListRecent'
```

- [ ] **Step 5: Commit**

---

### Task 3: PresenceService

**Files:**

- Create: `blog-backend/internal/service/analytics/presence.go`
- Create: `blog-backend/internal/service/analytics/presence_test.go`

**Interfaces:**

- Produces:

```go
const userOnlineKey = "user:online"
const presenceDBTouchPrefix = "user:presence:db_touch:"

type UserPresence interface {
	TouchUserOnline(ctx context.Context, userID uint) error
	IsUserOnline(ctx context.Context, userID uint) (bool, error)
	BatchIsUserOnline(ctx context.Context, userIDs []uint) (map[uint]bool, error)
	TouchActiveAt(ctx context.Context, userID uint) error // 60s 节流 + UpdateLastActiveAt + cache Invalidate
}

func NewUserPresence(rdb *redis.Client, repo userrepo.UserRepository, cache userservice.UserCacheService, onlineWindow time.Duration) UserPresence
```

- [ ] **Step 1: 写测试（miniredis）**

覆盖：ZADD、90s 内外 IsOnline、Batch、TouchActiveAt 60s 内只 Update 一次。

- [ ] **Step 2: 实现**

`TouchUserOnline`：`ZADD user:online score=unix member=strconv(uid)`

`BatchIsUserOnline`：pipeline `ZScore`，score >= now-onlineWindow → true

`TouchActiveAt`：`SET presenceDBTouch:{uid} NX EX 60` 成功才 `repo.UpdateLastActiveAt` + `cache.Invalidate`

- [ ] **Step 3: 跑测试**

```bash
cd blog-backend
go test ./internal/service/analytics/... -run UserPresence -v
```

- [ ] **Step 4: Commit**

---

### Task 4: Collect 接入 + Rollup 裁剪

**Files:**

- Modify: `blog-backend/internal/service/analytics/collect.go`
- Modify: `blog-backend/internal/service/analytics/collect_test.go`
- Modify: `blog-backend/internal/worker/analytics/rollup.go`
- Modify: `blog-backend/internal/worker/analytics/rollup_test.go`
- Modify: `blog-backend/internal/router/router.go`

**Interfaces:**

- Consumes: `UserPresence` from Task 3
- Modifies: `NewCollectService(..., presence UserPresence, ...)`

- [ ] **Step 1: collect_test 增用例**

已登录 heartbeat → `presence.TouchUserOnline` + `TouchActiveAt` 各 +1；suspect 事件 → 0。

- [ ] **Step 2: collect.Handle 分支**

```go
if ev.UserID != nil && !ev.IsBot && !ev.IsSuspect {
	if err := s.presence.TouchUserOnline(ctx, *ev.UserID); err != nil { ... }
	if err := s.presence.TouchActiveAt(ctx, *ev.UserID); err != nil { ... }
}
```

保留原有 `realtime.TouchOnline(visitorID)` 不变。

- [ ] **Step 3: rollup Cleanup 增裁剪**

```go
const userOnlineKey = "user:online"
// 与 analytics:online 同样 ZRemRangeByScore
```

- [ ] **Step 4: router 接线**

```go
userRepo := repository.NewUserRepository(db)
presence := analyticsservice.NewUserPresence(redisClient, userRepo, userCacheSvc, analyticsCfg.OnlineWindow)
collectSvc := analyticsservice.NewCollectService(..., presence, log)
```

- [ ] **Step 5: 跑测试**

```bash
cd blog-backend
go test ./internal/service/analytics/... ./internal/worker/analytics/... -v
```

- [ ] **Step 6: Commit**

---

### Task 5: 登录双写 + 废弃 login-time

**Files:**

- Modify: `blog-backend/internal/service/auth/auth.go`
- Modify: `blog-backend/internal/service/auth/auth_test.go`
- Modify: `blog-backend/internal/service/oauth/oauth.go`
- Modify: `blog-backend/internal/service/oauth/oauth_test.go`
- Modify: `blog-backend/internal/router/router.go`（auth/oauth 注入 presence）
- Modify: `blog-backend/internal/handler/user/user.go`（删 RecordLogin）
- Modify: `blog-backend/internal/service/user/user.go`（删 RecordLogin）
- Modify: `blog-backend/internal/handler/user/user_test.go`

**Interfaces:**

- Consumes: `UserPresence`, `TouchLoginPresence`

- [ ] **Step 1: auth/oauth 构造注入 `UserPresence`**

`issueLoginResp` / oauth 发 token 处：

```go
_ = s.repo.TouchLoginPresence(user.ID)
_ = s.presence.TouchUserOnline(context.Background(), user.ID)
_ = s.cache.Invalidate(...)
```

删除所有 `UpdateLastLoginAt` 直接调用。

- [ ] **Step 2: 删 login-time 路由与 handler**

`router.go` 移除 `authed.POST("/users/me/login-time", ...)`

- [ ] **Step 3: 更新 mock 期望**

auth_test / oauth_test 期望 `TouchLoginPresence` 而非 `UpdateLastLoginAt`。

- [ ] **Step 4: 跑测试**

```bash
cd blog-backend
go test ./internal/service/auth/... ./internal/service/oauth/... ./internal/handler/user/... -v
```

- [ ] **Step 5: Commit**

---

### Task 6: DTO + 用户 API enrichment

**Files:**

- Modify: `blog-backend/internal/dto/user.go`
- Create: `blog-backend/internal/service/user/presence_enrich.go`
- Modify: `blog-backend/internal/service/user/user.go`
- Modify: `blog-backend/internal/service/user/detail.go`
- Modify: `blog-backend/internal/service/user/user_test.go`（或新建 enrich 测试）

**Interfaces:**

- Consumes: `analytics.UserPresence`
- Produces: DTO 字段 `last_active_at`, `is_online`

- [ ] **Step 1: DTO 增字段**

```go
// UserListItemResp, UserDetailResp, UserPublicProfileResp
LastActiveAt *time.Time `json:"last_active_at,omitempty"`
IsOnline     bool       `json:"is_online"`
```

- [ ] **Step 2: userService 注入 presence**

`buildUserPageResp` / `buildPublicProfile` 后调用：

```go
func enrichPresence(ctx context.Context, p analytics.UserPresence, items []dto.UserListItemResp) {
	ids := collectIDs(items)
	onlineMap, _ := p.BatchIsUserOnline(ctx, ids)
	for i := range items {
		items[i].IsOnline = onlineMap[items[i].ID]
	}
}
```

`GetDetail` / `GetPublicProfile` 单用户同理。

- [ ] **Step 3: assembleUserDetail 透传 LastActiveAt**

- [ ] **Step 4: router 把 presence 传入 NewUserService**

- [ ] **Step 5: 跑测试 + swag 若 DTO 变更需 regen**

```bash
cd blog-backend
go test ./internal/service/user/... -v
```

- [ ] **Step 6: Commit**

---

### Task 7: 前端类型 + user-presence 工具

**Files:**

- Modify: `packages/api/src/types/user.ts`
- Create: `apps/web/lib/user-presence.ts`
- Create: `apps/web/lib/user-presence.test.ts`

**Interfaces:**

- Produces:

```typescript
export type PresenceDisplay =
  | { kind: "online"; label: "在线" }
  | { kind: "offline"; label: string }
  | { kind: "never"; label: "从未活跃" };

export function resolvePresenceDisplay(input: {
  is_online?: boolean;
  last_active_at?: string | null;
  last_login_at?: string | null;
}): PresenceDisplay;
```

- [ ] **Step 1: 写测试**

| is_online | last_active_at | last_login_at | 期望                       |
| --------- | -------------- | ------------- | -------------------------- |
| true      | any            | any           | online                     |
| false     | 5min ago       | —             | offline 「5 分钟前活跃过」 |
| false     | null           | 1d ago        | offline 降级 login         |
| false     | null           | null          | never                      |

- [ ] **Step 2: 实现 + API 类型**

- [ ] **Step 3: 跑测试**

```bash
cd blog-frontend
pnpm --filter web test -- --run lib/user-presence
pnpm -r check-types
```

- [ ] **Step 4: Commit**

---

### Task 8: UI 组件切换

**Files:**

- Modify: `apps/web/components/common/base-user-card.tsx`
- Modify: `apps/web/components/common/base-user-card.test.tsx`
- Modify: `apps/web/app/users/[id]/_components/user-banner.tsx`
- Modify: `apps/web/app/users/[id]/_components/user-info-header.tsx`
- Modify: `apps/web/app/users/[id]/_components/user-banner.test.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: BaseUserCard**

props.user 增 `is_online?`、`last_active_at?`；删除 `last_login_at` 在线判定；用 `resolvePresenceDisplay`。

- [ ] **Step 2: UserBanner / UserInfoHeader**

删除本地 `getOnlineStatus(lastLoginAt)`，改 `resolvePresenceDisplay`。

- [ ] **Step 3: page.tsx**

```typescript
const recentVisitors = recentUsersPage.list.map((u) => ({
  id: String(u.id),
  name: u.nickname || "User",
  avatar: u.avatar_url || "",
  is_online: u.is_online,
  last_active_at: u.last_active_at,
  last_login_at: u.last_login_at, // 仅展示降级
}));
```

`RecentVisitors` / `BaseUserCard` 传完整字段。

- [ ] **Step 4: 更新全部相关测试**

- [ ] **Step 5: 跑 web 测试**

```bash
pnpm --filter web test -- --run components/common/base-user-card app/users
```

- [ ] **Step 6: Commit**

---

### Task 9: 联调验证

- [ ] **Step 1: 跑 migration（已有库）**

```bash
mysql -h ... -u ... -p blog < blog-backend/migrations/20260626_user_last_active_at.sql
```

- [ ] **Step 2: 后端全量测试**

```bash
cd blog-backend && go test ./... 2>&1 | tail -20
```

- [ ] **Step 3: 前端全量测试**

```bash
cd blog-frontend && pnpm --filter web test -- --run
```

- [ ] **Step 4: 手工验收**

1. 登录 → 圈子/资料页立即「在线」
2. 停留 >90s 无操作（或关 tab 再开）→「X 前活跃过」
3. DevTools 可见 `/api/collect` heartbeat；DB `last_active_at` 约 60s 刷新
4. `redis-cli ZRANGE user:online 0 -1 WITHSCORES` 含当前 uid
5. 老用户迁移后离线展示「X 前活跃过」而非「从未活跃」（有 last_login_at 的）

- [ ] **Step 5: Commit（若有联调 fix）**

---

## Spec Coverage Checklist

| Spec §                         | Task                |
| ------------------------------ | ------------------- |
| last_active_at 字段 + 迁移回填 | Task 1              |
| user:online Redis              | Task 3, 4           |
| collect 写入                   | Task 4              |
| 登录双写 + Redis 即时在线      | Task 2, 5           |
| 废弃 login-time                | Task 5              |
| API is_online + last_active_at | Task 6              |
| 排序 last_active_at            | Task 2              |
| 前端展示规则 §3                | Task 7, 8           |
| 90s 窗口                       | Task 3（读 config） |

## Execution Handoff

Plan 已保存。执行方式：

1. **Subagent-Driven（推荐）** — 每 Task 派生子 agent，Task 间 review
2. **Inline Execution** — 本会话按 Task 顺序实施，检查点停等确认
