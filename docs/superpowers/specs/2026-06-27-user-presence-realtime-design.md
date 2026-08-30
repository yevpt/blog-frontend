# 用户在线状态实时刷新设计

日期：2026-06-27
范围：前后端均改 —— 新增后端批量在线感知端点，前端引入共享订阅库，统一更新全站在线状态展示。

## 与已有 spec 的关系

本 spec 是 [`2026-06-26-user-presence-design.md`](./2026-06-26-user-presence-design.md) 的**延续**，不覆盖、不冲突：

- 06-26 解决「**数据 / 语义层**」：Redis `user:online` ZSET 数据源、`users.last_active_at` 字段、collect 写入链路、90s 在线判定窗口、`is_online`/`last_active_at`/`last_login_at` 三字段语义、`resolvePresenceDisplay` 展示文案。已落地（`internal/service/analytics/presence.go`、`internal/service/user/presence_enrich.go`、`apps/web/lib/user-presence.ts` 均为其产物）。
- 本 spec（06-27）解决「**客户端实时刷新**」：页面挂着不动时在线态不再自动更新 —— 引入批次轮询订阅库，让消费点随订阅集自动跟随刷新。仅新增一个**只读** batch 端点 `GET /users/presence`，复用 06-26 落地的 `BatchIsUserOnline`，不改动任何写入链路、不改判定窗口、不改字段语义、不改 `resolvePresenceDisplay` 文案规则。
- 两者周期独立：后端 90s 是「在线判定窗口」，前端 60s 是「轮询周期」—— 无耦合、无矛盾。
- 06-26「范围外」列了「Admin 用户列表在线态可复用 `BatchIsUserOnline`」；本方案把同一个 batch 能力同时开放给公开 web 端，与该方向一致。

## 背景

现状：个人详情页（`apps/web/app/users/[id]`）、首页「最近访客」、圈子页成员卡、`BaseUserCard` 等位置的「在线 / 离线 / X 分钟前活跃过」文案，全部来自请求时一次取下的 `is_online` / `last_active_at` / `last_login_at` 字段（`UserPublicProfileResp` / `UserListItemResp`），页面挂着不动时不再刷新；只有手动刷新页面才更新。

后端无 WebSocket / SSE，只能 HTTP 轮询；与现有「通知中心轮询」「admin RealtimeTab」同思路。

## 目标 / 非目标

- 目标：在线状态以约 1 分钟延迟感知到位；标签页隐藏时完全暂停；多消费点共享单一批次轮询，不被卡片数量放大请求数；圈子页虚拟滚动只订阅视口内 id。
- 非目标：不做「秒级实时」、不引 WebSocket / SSE、不引 react-query / swr、不重构 admin 端在线态展示。

## 架构总览

```
┌─ apps/web/PresenceProvider (client, 挂根 layout) ──────────┐
│  store.records: Map<id, PresenceRecord>      (zustand)     │
│  subscribers:  Map<number, true>  LRU + 硬上限 100          │
│  唯一计时器: setTimeout 递归（可退避）                       │
│  visibilitychange: hidden → clearTimeout                    │
│                    visible → restart()（清 failCount+立即拉）│
│  订阅集变化(去抖 200ms) → restart()                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ getSubscribedIds()  → 最多 100
                   │ fetchPresence(ids)
                   ▼
   GET /users/presence?ids=1,2,...     ← OptionalAuth + RateLimitPublic
                   ▼
┌─ blog-backend internal/handler/user.BatchPresence ─────────┐
│  1. parse csv ids：去重 / 丢弃非数字 / 截断 100           │
│  2. presence.BatchIsUserOnline(ids)  → is_online (Redis ZSET)│
│  3. userRepo.BatchFetchActiveLogin(ids) → 时间戳            │
│  4. zip 成 map[uint]*UserPresenceResp                        │
│  5. 未知 id 字段缺席（不 4xx）                              │
└─────────────────────────────────────────────────────────────┘
```

消费点（详情页、首页 sidebar、圈子页 `BaseUserCard`、`UserInfoHeader`、`UserBanner`）接入 `usePresence(id, seed)`：服务端初值通过 `seed` 写进 store（幂等，不覆盖轮询新值），随后从 store 读，自动随轮询更新。UI 渲染仍走现有的纯函数 `resolvePresenceDisplay`，渲染逻辑不动。

## 后端端点契约 & 实现

### 路由

`GET /users/presence?ids=1,2,3,...` —— 挂到 `internal/router/router.go` 现有公开 user 路由紧邻 `/users/recent`，用 `RateLimitPublic` + `OptionalAuth`，与 `/users/:id` 同档。

### Query

`ids` CSV，前端最多传 100；后端**防御性截断到 100**（双保险），不报错；重复 id 自动去重；字符串非数字静默丢弃。

### DTO（`internal/dto/user.go` 新增）

```go
// UserPresenceResp 单个用户的在线感知片段
type UserPresenceResp struct {
    IsOnline     bool   `json:"is_online"`
    LastActiveAt *int64 `json:"last_active_at,omitempty"` // unix 秒
    LastLoginAt  *int64 `json:"last_login_at,omitempty"`
}
// BatchPresenceResp 批量在线感知
type BatchPresenceResp struct {
    Data map[uint]UserPresenceResp `json:"data"`
}
```

`*time.Time` 转为 unix 秒（int64）减小体积，前端再 `new Date(sec*1000)`；时间字段落 `omitempty`，未知 id 在 `data` 中整条缺席。

### Service 层（`internal/service/user` 新建 `presence.go`）

```go
// PresenceProvider 批量返回用户在线与最近活跃/登录时间。
type PresenceProvider interface {
    BatchPresence(ctx context.Context, ids []uint) (map[uint]*dto.UserPresenceResp, error)
}
```

复用两件现成事：

1. `OnlineChecker.BatchIsUserOnline(ctx, ids)` —— 已有，Redis pipeline ZSET（`internal/service/analytics/presence.go`）。
2. **新增** `userrepo.BatchFetchActiveLogin(ctx, ids)`（`repository/user`）：`SELECT id, last_active_at, last_login_at FROM users WHERE id IN (?)`，返回 `map[uint]*ActiveLogin{ LastActiveAt, LastLoginAt *time.Time }`。

service 把两者 zip 成 `map[uint]*dto.UserPresenceResp`；任意一步出错返回 err（不写脏数据），handler 决定响应。nil `time.Time` → 字段缺席（不写 0）。

### Handler（`internal/handler/user/user.go` 加 `BatchPresence`）

- 解析 `ids`：csv split → `strconv.ParseUint` → 过滤非数字 → 去 `map[uint]struct{}` → 转 slice；len 超 100 截断。
- 空 ids 早返回 `{data:{}}`，不打 Redis/DB。
- 调 `service.BatchPresence`；err 用现成 `response` 包返回；不存在字段不单独 4xx。

### Swagger / 分层合规

- 按 `http-api` skill 加注解 + `make swag`。
- 按 `go-layering` skill：handler 仅做参数解析 → service → response；handler 不直接碰 repo/presence。

## 前端订阅库与 hook

### API 层（`packages/api`）

新增类型 `packages/api/src/types/user.ts`：

```ts
export interface UserPresenceResp {
  is_online: boolean;
  last_active_at?: number; // unix 秒
  last_login_at?: number;
}
export interface BatchPresenceResp {
  data: Record<number, UserPresenceResp>;
}
```

`packages/api/src/client.ts` 加方法，走 `fetchOptionalAuth`（公开 + 可选鉴权，与 `getPublicProfile` 同档）：

```ts
users: {
  presence: {
    /** 批量查询多用户在线状态（轻量端点，最多 100 个 id） */
    batch: (ids: number[]) =>
      fetchOptionalAuth<BatchPresenceResp>(
        `/users/presence${ids.length ? `?ids=${ids.join(",")}` : ""}`,
        { method: "GET" },
      ),
  },
}
```

### Store（`apps/web` 新建 `lib/presence-store.ts`）

zustand（仓库已用），非持久化，client-only：

```ts
type PresenceRecord = {
  is_online: boolean;
  last_active_at?: number; // unix 秒
  last_login_at?: number;
};

interface PresenceState {
  records: Map<number, PresenceRecord>;
  seed: (id: number, r: PresenceRecord) => void; // 幂等：仅在该 id 无记录时写入
  apply: (batch: Record<number, PresenceRecord>) => void; // 轮询结果合并
  get: (id: number) => PresenceRecord | undefined;
}
```

- `seed` 严格 `if (!records.has(id)) set(...)` —— 服务端初值不能覆盖轮询新值。
- `records` 用 `Map` 而非对象，避免 number key 序列化坑；`apply` 用不可变更新触发 React（新建 `Map` 实例）。
- `records` 不做淘汰：每条 <50 字节，session 内最多几百条，无 LRU 维护成本、避免重挂载闪屏。

### 订阅集（`apps/web` 新建 `lib/presence-subscriptions.ts`）

**LRU 有序集合 + 硬上限 100，无 refcount。** 当前所有页面不会同时挂载两张同 id 的消费卡片；即便未来出现，退化温和——退订时简单 `delete`，那张卡继续读 store 上次 apply 旧值，下次重挂载再回订阅集。

```ts
const MAX_SUBSCRIBERS = 100;
const subscribers = new Map<number, true>(); // 仅用 Map 维持插入序，value 无意义

export function subscribe(ids: number[]): () => void {
  for (const id of ids) {
    subscribers.delete(id); // 先删 → 重设后位于末位（最新）
    subscribers.set(id, true);
  }
  trim();
  emit();
  return () => {
    for (const id of ids) subscribers.delete(id); // 不存在则静默忽略
    emit();
  };
}

function trim() {
  if (subscribers.size <= MAX_SUBSCRIBERS) return;
  const drop = subscribers.size - MAX_SUBSCRIBERS;
  let i = 0;
  for (const key of subscribers.keys()) {
    // 头部 = 最久未订阅
    subscribers.delete(key);
    if (++i >= drop) break;
  }
}

export function getSubscribedIds(): number[] {
  return [...subscribers.keys()]; // 最旧→最新，最多 100
}
export function onSubscriptionChange(cb: (ids: number[]) => void): () => void;
```

- 「最新加入排末位」配合 `keys()` 自然 LRU；硬上限 100 防 data 无限堆积。
- cleanup `delete` 不存在 id 静默忽略；不写负数 / NaN。
- `onSubscriptionChange` 在订阅集真变化时（subscribe / cleanup）触发 listener。

### Provider（`apps/web` 新建 `app/providers/presence-provider.tsx`）

挂在 web 根 layout（与 `SessionProvider`、`NotificationProvider` 同层），仅一实例。

```ts
"use client";
const PRESENCE_POLL_MS = 60_000;
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_CAP_MS = 5 * BACKOFF_BASE_MS;  // 300s

export function PresenceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let timer: number | null = null;
    let failCount = 0;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** failCount, BACKOFF_CAP_MS);
      timer = window.setTimeout(() => void tick(), delay);
    };

    const tick = async () => {
      const ids = getSubscribedIds();
      if (ids.length === 0) return;   // 空集不打、停 tick；下次 subscribe 触发 restart
      try {
        const resp = await apiClient.users.presence.batch(ids);
        const batch: Record<number, PresenceRecord> = {};
        for (const [k, v] of Object.entries(resp.data)) {
          batch[Number(k)] = {
            is_online: v.is_online,
            last_active_at: v.last_active_at,
            last_login_at: v.last_login_at,
          };
        }
        store.apply(batch);
        failCount = 0;
      } catch {
        failCount += 1;   // 不弹 cue、不改 store
      }
      schedule();         // 续命，按 failCount 决定 next interval
    };

    const restart = () => {
      if (timer) clearTimeout(timer);
      failCount = 0;       // 唯一清零点之一
      void tick();
    };

    const debouncedRestart = debounce(restart, 200);
    const unsubSub = onSubscriptionChange(debouncedRestart);
    const onVis = () => {
      if (document.hidden) {           // 隐藏：停 tick，不清 failCount、不立即拉
        if (timer) { clearTimeout(timer); timer = null; }
      } else {
        restart();                     // 切回：清零 + 立即拉 + 续命
      }
    };
    document.addEventListener("visibilitychange", onVis);
    restart();   // 首次启动

    return () => {
      if (timer) clearTimeout(timer);
      unsubSub();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <>{children}</>;
}
```

- `setTimeout` 递归（非 `setInterval`）：失败时能拉长间隔。
- `debouncedRestart` 200ms 去抖：高频滚动 / 挂载抖动不连发请求。

### Hook（`packages/hooks` 新增 `use-presence.ts`）

通用、不绑死 web：

```ts
export interface UsePresenceResult {
  record: PresenceRecord | undefined; // undefined → UI 占位
}
export function usePresence(
  id: number | null | undefined,
  seed?: PresenceRecord,
): UsePresenceResult;
```

实现要点：

- `useEffect` 内：`id != null` → `subscribe([id])`，返回 cleanup。
- 同一 memo 周期内 `store.seed(id, seed)`；用 `id+seed` 作 deps 防重复 seed。
- 通过 zustand `useStore(selector)` 订阅 `records.get(id)`，自动重渲。
- `id == null` → 不订阅，返回 `{ record: undefined }`。

### 消费点接线

- **`base-user-card.tsx`**：删 `resolvePresenceDisplay(user)` 那段，改 `const { record } = usePresence(user.id, { is_online: user.is_online, last_active_at: user.last_active_at, last_login_at: user.last_login_at })`；presence 优先取 `record` 退化到 `seed`；保留 `hydrated` 占位逻辑（#418）。
  - seed 字段类型转换：server 端 `last_active_at` 是 `string`，store 是 `number`；seed 时统一转 unix 秒写到 store。
- **`user-info-header.tsx` / `user-banner.tsx`**：`is_online` / `last_active_at` / `last_login_at` props 不再直达，改 `usePresence(profile.id, ...)`。
- **`recent-visitors.tsx` / `user-profile-page.tsx`**：本身不读 presence，把 server 初值传给 `BaseUserCard` / `UserInfoHeader` 作为 `seed`。

## 圈子页虚拟滚动接入

### 自动收集 / 自动清理（无需改 circle 代码）

- `circle-list.tsx` 渲染 `<UserCard>` → 内部 `<BaseUserCard>` → 内部 `usePresence(user.id, seed)`。
- `VirtuosoGrid`（`overscan=400`）把视口外的 `itemContent` 卸载 → `BaseUserCard` unmount → `usePresence` 的 cleanup 执行 → 该 id `delete` 出订阅集。
- 滚回视口 → 卡片重挂载 → `usePresence` 再 `subscribe` + `seed`；store 里若已有 record（之前轮询过），`seed` 静默不覆盖，UI 立即显示上次轮询值，下个 tick 再更新。
- → **圈子页 `user-card.tsx` / `circle-list.tsx` 都不需要改**；接入是 `BaseUserCard` 内部改造的副产品。

### 滚动抖动节流

快速滚动高频触发 subscribe / unsubscribe → `onSubscriptionChange` → `restart`。provider 侧 200ms 去抖（§3.4 `debouncedRestart`）；visibilitychange 不去抖（切回立即拉）。

### overscan 边界

`overscan=400` 让视口外约 1 ~ 2 屏保持挂载 —— 订阅集大约覆盖「视口 + overscan」内的几十到一百多 id，用户滚到时已有最近 60s 内的轮询值，避免「滚入即占位空白」。订阅集硬上限 100 保证不会订阅全量（圈子可能上千用户）。

### 超过端点 100 上限的兜底

前端订阅集硬上限 100 已保证传给端点 ≤100；后端 100 截断是双保险。订阅集淘汰的是「最久没人最近订阅」的 id（Map 头部）—— 与已离开视口或即将卸载的卡片语义一致。

## 错误处理 / 退避

### tick 失败处理

| 失败位                                | 处理                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `apiClient.users.presence.batch` 抛错 | 捕获、不 bubble；保留 store 当前 `records`（UI 显示旧值，不闪退）；进入退避 |
| 响应里某 id 缺失                      | 只 apply 命中的 id，缺失的不清空，下轮再试                                  |
| 响应体非法                            | 同网络错误处理                                                              |
| `document.hidden` 时                  | 不打、不变 timer                                                            |
| 订阅集空                              | 早返回，不打、停 timer；下次 subscribe 触发 restart                         |

### 退避序列

`BACKOFF_BASE_MS = 60_000`，`BACKOFF_CAP_MS = 5 * BACKOFF_BASE_MS = 300_000`。_failCount_ 上限不设硬截断（继续递增不影响已封顶的 interval）：

| 连续失败次数 | 下次 interval |
| ------------ | ------------- |
| 0（成功）    | 60s           |
| 1            | 120s          |
| 2            | 240s          |
| 3            | 300s（封顶）  |
| ≥ 4          | 300s          |

封顶靠 `Math.min(BACKOFF_BASE_MS * 2 ** failCount, BACKOFF_CAP_MS)`：failCount=3 时 `60*8=480` 被 cap 到 300，failCount ≥ 3 恒为 300。

### `restart()` 统一语义

`restart()` 唯一职责四步、不可拆分：

1. `clearTimeout(prevTimer)`
2. `failCount = 0` —— 无论之前是网络失败还是 visibility 隐藏导致停 tick。
3. `tick()` —— 立即拉一次；若仍失败则内部 `failCount = 1`，`schedule()` 退避 120s。
4. step 3 成功后 `schedule()` 续命，回正常 60s 循环。

触发 `restart()` 的两个入口语义完全一致：

- **visibility 恢复**（`document.hidden = false`）：清零 + 立即拉 + 续命。
- **订阅集变化**（debouncedRestart 200ms 后）：清零 + 立即拉 + 续命。

只有 tick 自身结束续命不走 restart、只走 `schedule()`，此时保留真实 `failCount` —— 成功 → 0、失败 → +1，按上表递推。

唯一不 reset 的边界：`document.hidden = true` 时只 `clearTimeout`、不清 `failCount`、不立即拉。下次 restart 自会清零，无需提前。`failCount` 仍是 module-level 闭包变量，不在 store 里；归零点只有 `restart()` 和 `tick()` 成功两处。

## 测试

### 前端（Vitest + jsdom）

**`packages/hooks/use-presence.test.ts`**

- `id=null` → 不订阅、`record=undefined`。
- `id=42` → subscribe 被调一次；cleanup 卸载被 unsubscribe。
- `seed` 写入 store；返回的 record 反映 store。
- `seed` 二次调用不覆盖 `apply` 写入的最新值（关键：测 seed 幂等）。

**`apps/web/lib/presence-store.test.ts`**

- `seed(id, recA)` 后 `apply({id: recB})` → get = recB（apply 优先）。
- `seed` 已存在 id 不覆盖。
- `apply` 多 id 合并、未触及的 id 保留。

**`apps/web/lib/presence-subscriptions.test.ts`**

- 订阅顺序：`subscribe([1,2,3])` → `subscribe([4,5])` → keys 为 `[1,2,3,4,5]`。
- 重订阅 LRU：`subscribe([1,2,3])` → `subscribe([1])` → keys 为 `[2,3,1]`。
- 硬上限：连续 `subscribe([i])` 100 次后，第 101 次淘汰最早那条；size 恒 ≤ 100。
- cleanup 删除；不存在的 id `delete` 静默忽略。
- `onSubscriptionChange` 在订阅集真变化时被调（cleanup 也触发）。

**`apps/web/app/providers/presence-provider.test.tsx`** — fake timers + `apiClient.users.presence.batch` mock：

- 挂载 50 个 `usePresence` → 60s 后 mock 被调一次、参数含全部 50 ids。
- `document.hidden = true` → 60s 内不被再次调用。
- 切回 visible → 立即调用一次。
- mock reject → 下次 interval = 120s（指数退避）。
- 连续 reject 5 次 → interval 封顶 300s。
- 订阅集空 → 不被调用。
- 订阅集变化去抖 200ms → 高频 subscribe 不连发请求。

**集成**：

- `base-user-card.test.tsx` 补一个「seed 来自 user prop；store apply 后卡片更新文案」的用例，替换原 `resolvePresenceDisplay` 测试点。

### 后端

`internal/service/user` 新增 `presence_test.go`（gomock）：

- `BatchIsUserOnline` 全在线 / 全离线 / 部分。
- `BatchFetchActiveLogin` 返回 `*time.Time` 正确转 unix 秒；nil 时间 → 字段缺席（不写 0）。
- 未知 id：返回的 map 不含该键。

`internal/handler/user/user_test.go` 加 `TestBatchPresence`（httptest）：

- ids 解析：CSV 重复去除、非数字丢弃、超 100 截断、空 → `{}`。
- handler 调用 service、断响应体。
- service err → 5xx。

## 风险 / 取舍

- 去掉 refcount 后，同 id 多消费卡片场景下退订早于最后一张卡片卸载——该 id 在最后一张卡片上读到的是 store 上次 apply 的旧值，不再刷新，直到它自己也重挂载。当前页面不触发，可接受。
- 在线态来自 Redis ZSET（`UserOnlineKey`），后端 `BatchIsUserOnline` 已经过验证；新加 `BatchFetchActiveLogin` 只是只读 `SELECT ... IN (?,?,?)`，风险低。
- 前端订阅集硬上限 100 与 overscan 配置耦合：极端宽屏 + 大 overscan 可能一次需订阅 >100，溢出部分被淘汰后该 tick 不更新、下轮再覆盖。默认配置下不触发。
