# 用户 Presence（在线 / 最近活跃）设计

**日期：** 2026-06-26  
**状态：** 待评审  
**范围：** `blog-backend` + `blog-frontend`（web 用户在线展示与 collect 链路接入）

---

## 1. 背景与问题

| 现状                                                                   | 问题                           |
| ---------------------------------------------------------------------- | ------------------------------ |
| Analytics 心跳（15s）→ Redis `analytics:online`（member=`visitor_id`） | 只服务站点统计，与用户 UI 无关 |
| UI 用 `last_login_at` + 3 分钟阈值判「在线」                           | 语义错误；仅登录时更新         |
| `POST /users/me/login-time` 存在但前端未调用                           | 死代码，且语义仍是「登录」     |

**目标：** 将**认证**（login）与**活跃**（presence）分离；collect 为 presence 唯一写入源；UI 展示真实在线与最近活跃时间。

---

## 2. 核心原则

```
认证域：last_login_at      ← 仅 Login / OAuth 等认证事件
活跃域：last_active_at     ← collect（page_view + heartbeat）节流写 DB
         user:online (Redis) ← 每次可信 collect 即时 ZADD（member=user_id）
展示域：is_online + last_active_at ← API 返回；前端只读，不自行推算
```

**在线窗口：** **90 秒**，与 `analytics.online_window` 共用同一 config 值。

---

## 3. 展示规则（离线 / 无活跃记录）

### 3.1 在线

- 条件：`is_online === true`（后端 Redis `user:online` 判定，90s 窗口）
- 文案：**「在线」**

### 3.2 离线但有活跃记录

- 条件：`is_online === false` 且存在可展示的活跃时间（见 3.4 取值顺序）
- 文案：`formatRelativeTime(t) + "活跃过"`，例如「3 天前活跃过」「2 个月前活跃过」
- **长期未访问**走此分支：只要历史上曾有过活跃/登录回填，`last_active_at` 保留最后一条时间戳，相对时间自然变长，**不会**因为没有近期访问而变成空白

### 3.3 从未有过活跃记录

- 条件：`is_online === false`，且按 3.4 取值顺序仍无可用时间
- 文案：**「从未活跃」**
- 典型用户：注册后从未登录、或上线前既无 `last_active_at` 也无 `last_login_at` 可回填

### 3.4 活跃时间取值顺序（仅用于离线相对时间，**不**用于判在线）

前端与服务端 DTO 组装统一遵循：

1. `last_active_at`（presence 主字段）
2. `last_login_at`（**仅展示降级**：迁移回填后仍为空的历史边缘 case；**不参与**在线判定）
3. 皆空 → 走 3.3「从未活跃」

> **在线判定只看 `is_online`**，不看 `last_active_at` 与当前时间的差值。前端删除 `Date.now() - last_login_at < 3min` 逻辑。

### 3.5 示例

| 场景                     | is_online | last_active_at           | 展示           |
| ------------------------ | --------- | ------------------------ | -------------- |
| 正在浏览站点             | true      | 刚刚                     | 在线           |
| 5 分钟前关 tab           | false     | 5 分钟前                 | 5 分钟前活跃过 |
| 3 个月未访问             | false     | 3 个月前                 | 3 个月前活跃过 |
| 上线前老用户（迁移回填） | false     | = 原 last_login_at       | X 前活跃过     |
| 注册从未登录             | false     | null，last_login_at null | 从未活跃       |
| 刚登录、首个心跳未到     | true      | 登录时写入               | 在线           |

---

## 4. 数据模型

### 4.1 MySQL `users`

新增：

| 字段             | 类型            | 说明                 |
| ---------------- | --------------- | -------------------- |
| `last_active_at` | `datetime NULL` | 最后一次可信活跃时间 |

`last_login_at` 保留，仅认证时更新。

**登录双写（强制）：** 所有认证成功路径必须用**单条 SQL** 原子更新 `last_login_at` 与 `last_active_at`（`NOW()`），并 `Invalidate` 用户缓存；同时 `ZADD user:online` 使用户登录后即刻 `is_online=true`，无需等待 collect 心跳。

覆盖路径：

- `auth.issueLoginResp`（密码登录 / 注册后自动登录）
- `oauth` 登录发 token 路径
- ~~`POST /users/me/login-time`~~（废弃，由 collect 接管活跃刷新）

**增量迁移脚本（现有库必跑）：** `blog-backend/migrations/20260626_user_last_active_at.sql`

```sql
-- 2026-06-26: 用户最近活跃时间 + 历史数据回填
ALTER TABLE `user`
  ADD COLUMN `last_active_at` datetime NULL COMMENT '最后活跃时间' AFTER `last_login_at`;

UPDATE `user`
SET `last_active_at` = `last_login_at`
WHERE `last_active_at` IS NULL AND `last_login_at` IS NOT NULL;
```

**新库：** GORM `AutoMigrate` 通过 `model.User.LastActiveAt` 补齐列；`make dbsetup` 后新用户两字段均为 NULL 直至首次登录/collect。

未登录过的历史用户迁移后 `last_active_at` 仍为 NULL → UI「从未活跃」，符合语义。

### 4.2 Redis `user:online`

```
Key:    user:online
Type:   ZSET
Member: user_id（字符串）
Score:  最后活跃 unix 时间戳
```

- 与 `analytics:online`（visitor 维度）并行，职责分离
- 裁剪：analytics rollup `Cleanup` 对 `user:online` 执行 `ZREMRANGEBYSCORE`（score < now - online_window）

**DB 写节流辅助 key：**

```
user:presence:db_touch:{uid}  TTL 60s
```

控制 `last_active_at` 写库频率（collect 15s 心跳不会每 tick 打 DB）。

---

## 5. 后端写入（collect 链路）

在 `collect.Handle` 中，当 **`user_id != nil && !is_bot && !is_suspect`**：

1. `presence.TouchUserOnline(ctx, userID)` — 每次事件 ZADD `user:online`
2. `presence.TouchActiveAt(ctx, userID)` — Redis NX 60s 节流 → `UPDATE last_active_at` + `UserCacheService.Invalidate`

**page_view 与 heartbeat 均触发。**

**不**在 collect 中更新 `last_login_at`。

### 5.1 PresenceService

```go
type Presence interface {
    TouchUserOnline(ctx context.Context, userID uint) error
    IsUserOnline(ctx context.Context, userID uint) (bool, error)
    BatchIsUserOnline(ctx context.Context, userIDs []uint) (map[uint]bool, error)
    TouchActiveAt(ctx context.Context, userID uint) error
}
```

列表/详情 API 组装 DTO 时 `BatchIsUserOnline` → `is_online`。

---

## 6. API 变更

### 6.1 DTO 新增

```go
LastActiveAt *time.Time `json:"last_active_at,omitempty"`
IsOnline     bool        `json:"is_online"`
```

影响：`UserListItemResp`、`UserPublicProfileResp`、`UserDetailResp`（及前端 `@repo/api` 对应类型）。

`last_login_at` 保留返回，**前端在线 UI 不再使用**。

### 6.2 排序

| 接口                | 新排序                                    |
| ------------------- | ----------------------------------------- |
| `GET /users/recent` | `last_active_at DESC`（最近**活跃**访客） |
| `GET /users/public` | 角色权重 + `last_active_at DESC`          |

### 6.3 废弃

- **`POST /users/me/login-time`**：标记 deprecated，下一版本删除

---

## 7. 前端变更

### 7.1 组件

| 文件                            | 变更                                             |
| ------------------------------- | ------------------------------------------------ |
| `BaseUserCard`                  | 读 `is_online` / `last_active_at`；离线文案见 §3 |
| `UserBanner` / `UserInfoHeader` | 同上                                             |
| `app/page.tsx`                  | 去掉 `isOnline: false` 硬编码，用 API 字段       |

### 7.2 展示函数（建议抽到 `@/lib/user-presence`）

```typescript
type PresenceDisplay =
  | { kind: "online" }
  | { kind: "offline"; label: string } // "3 天前活跃过"
  | { kind: "never" }; // "从未活跃"

function resolvePresenceDisplay(input: {
  is_online: boolean;
  last_active_at?: string | null;
  last_login_at?: string | null;
}): PresenceDisplay;
```

### 7.3 Analytics tracker

**无需改动**；presence 在后端 collect 接入。

---

## 8. 缓存

- `TouchActiveAt` 写 DB 后 `UserCacheService.Invalidate(uid)`
- `is_online` 由 Redis 实时 batch 查询，**不写入** profile 缓存 JSON

---

## 9. 架构

```
AnalyticsTracker → /api/collect → collect.Handle
                                      ↓
                              PresenceService
                              ├─ ZADD user:online（每次）
                              └─ 节流 UPDATE last_active_at（60s）
                                      ↓
用户 API ← BatchIsUserOnline + last_active_at
                                      ↓
BaseUserCard / UserBanner（is_online + 相对时间）
```

---

## 10. 测试要求

### 后端

- `TouchUserOnline` / `BatchIsUserOnline`：90s 内外判定
- `TouchActiveAt`：60s 内重复调用只写一次 DB
- collect（已登录 heartbeat）：刷新 `user:online` + 节流写 `last_active_at`
- collect suspect/bot：不刷新 presence
- Login：双写 `last_login_at` + `last_active_at`
- 迁移回填后老用户有 `last_active_at`
- `/users/recent` 按 `last_active_at` 排序

### 前端

- `is_online=true` →「在线」
- `is_online=false` + 有 `last_active_at` →「X 前活跃过」
- 皆空 →「从未活跃」
- `last_active_at` 空、`last_login_at` 有 → 降级展示（边缘 case）
- 移除 `last_login_at` 在线判定相关测试

---

## 11. 范围外

- Admin 用户列表在线态（后续可复用 `BatchIsUserOnline`）
- 修改 `analytics:online`（visitor 统计）逻辑
- 多设备：同一 `user_id` 单 ZSET member，天然合并

---

## 12. 已确认决策

| 项                          | 决策                                                                       |
| --------------------------- | -------------------------------------------------------------------------- |
| 在线窗口                    | 90s，与 analytics 一致                                                     |
| `/users/recent` 排序        | `last_active_at DESC`                                                      |
| 离线文案                    | 「X 分钟前活跃过」                                                         |
| `POST /users/me/login-time` | 废弃                                                                       |
| 长期未访问展示              | 保留最后 `last_active_at`，相对时间拉长（§3.2）                            |
| 无活跃记录                  | 「从未活跃」；迁移从 `last_login_at` 回填（§4.1）                          |
| 登录双写                    | 单 SQL 写 `last_login_at` + `last_active_at` + Redis `user:online`（§4.1） |
| 迁移脚本                    | `migrations/20260626_user_last_active_at.sql` 上线必跑（§4.1）             |
