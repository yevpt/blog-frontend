# 友邻页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现博客「友邻」页面，包含可折叠申请规则卡片 + 响应式友情链接列表，支持「失联」状态标识。

**Architecture:** 后端新增 `status=2`（失联）枚举值，前端 Server Component 一次全量拉取友链列表，由 `FriendLinkCard` 负责正常/失联的差异渲染，公共 `FadeInUp` 组件提供入场动效复用能力。

**Tech Stack:** Go (GORM), Next.js App Router, React, TypeScript, TailwindCSS, Vitest, @testing-library/react

---

## 文件清单

| 操作 | 路径                                                                | 说明                                               |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------- |
| 修改 | `blog-backend/internal/model/friend_link.go`                        | Status comment tag 加 `2=失联`                     |
| 修改 | `blog-backend/internal/dto/friendlink.go`                           | Status 字段注释加 `2=失联`                         |
| 修改 | `blog-backend/internal/service/friendlink.go`                       | 新增 `friendLinkStatusDisconnected` 常量，更新校验 |
| 修改 | `blog-backend/internal/repository/friendlink.go`                    | ListPublic 查询包含 status=1 和 status=2           |
| 新增 | `packages/api/src/types/friend-link.ts`                             | 前端 API 响应类型                                  |
| 修改 | `packages/api/src/client.ts`                                        | 新增 `friendLinks.listPublic`                      |
| 修改 | `packages/api/src/index.ts`                                         | 导出新类型                                         |
| 修改 | `apps/web/app/globals.css`                                          | 新增 `@keyframes fadeInUp` + `.animate-fade-in-up` |
| 新增 | `packages/ui/src/fade-in-up.tsx`                                    | 公共入场动效组件                                   |
| 新增 | `packages/ui/src/fade-in-up.test.tsx`                               | FadeInUp 测试                                      |
| 修改 | `packages/ui/src/index.ts`                                          | 导出 `FadeInUp`                                    |
| 新增 | `apps/web/components/friend-links/friend-link-card.tsx`             | 单张友链卡片                                       |
| 新增 | `apps/web/components/friend-links/friend-link-card.test.tsx`        | 卡片测试                                           |
| 新增 | `apps/web/components/friend-links/friend-links-rules-card.tsx`      | 申请规则可折叠卡片                                 |
| 新增 | `apps/web/components/friend-links/friend-links-rules-card.test.tsx` | 规则卡片测试                                       |
| 新增 | `apps/web/components/friend-links/friend-links-list.tsx`            | 友链列表网格                                       |
| 新增 | `apps/web/components/friend-links/friend-links-list.test.tsx`       | 列表测试                                           |
| 新增 | `apps/web/components/friend-links/friend-links-page.tsx`            | 页面主体组件                                       |
| 新增 | `apps/web/components/friend-links/index.ts`                         | 组件入口导出                                       |
| 新增 | `apps/web/app/friend-links/page.tsx`                                | 路由页面（Server Component）                       |
| 新增 | `apps/web/app/friend-links/page.test.tsx`                           | 路由页面测试                                       |

---

## Task 1: 后端 status=2 支持

**Files:**

- Modify: `blog-backend/internal/model/friend_link.go`
- Modify: `blog-backend/internal/dto/friendlink.go`
- Modify: `blog-backend/internal/service/friendlink.go`
- Modify: `blog-backend/internal/repository/friendlink.go`

- [ ] **Step 1: 更新 model comment tag**

`blog-backend/internal/model/friend_link.go` 第 12 行，将：

```go
Status uint8 `gorm:"type:tinyint;default:1;comment:状态 0=隐藏 1=显示" json:"status"`
```

改为：

```go
Status uint8 `gorm:"type:tinyint;default:1;comment:状态 0=隐藏 1=显示 2=失联" json:"status"`
```

- [ ] **Step 2: 更新 DTO 注释**

`blog-backend/internal/dto/friendlink.go`，在 `FriendLinkCreateReq`、`FriendLinkUpdateReq`、`FriendLinkItemResp` 中找到 Status 字段的注释，改为包含 `2=失联`。例如 `FriendLinkItemResp` 中：

```go
// Status 状态：0 隐藏，1 显示，2 失联。
Status uint8 `json:"status" example:"1"`
```

`FriendLinkCreateReq` 和 `FriendLinkUpdateReq` 中同样补充 `2=失联` 的说明。

- [ ] **Step 3: service 新增常量并更新校验**

`blog-backend/internal/service/friendlink.go`，在 `const` 块里新增：

```go
friendLinkStatusDisconnected uint8 = 2
```

将 `validateFriendLinkStatus` 函数改为：

```go
func validateFriendLinkStatus(status uint8) error {
    if status != friendLinkStatusHidden &&
        status != friendLinkStatusVisible &&
        status != friendLinkStatusDisconnected {
        return ErrFriendLinkStatusInvalid
    }
    return nil
}
```

- [ ] **Step 4: repository ListPublic 包含失联数据**

`blog-backend/internal/repository/friendlink.go`：

在文件顶部常量块里新增（或修改已有常量）：

```go
const (
    friendLinkVisibleStatus      uint8 = 1
    friendLinkDisconnectedStatus uint8 = 2
)
```

将 `ListPublic` 里的 query 条件从：

```go
query := r.db.Model(&model.FriendLink{}).Where("status = ?", friendLinkVisibleStatus)
```

改为：

```go
query := r.db.Model(&model.FriendLink{}).Where("status IN ?", []uint8{friendLinkVisibleStatus, friendLinkDisconnectedStatus})
```

- [ ] **Step 5: 编译验证**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go build ./...
```

预期：无编译错误。

- [ ] **Step 6: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
git add internal/model/friend_link.go internal/dto/friendlink.go \
        internal/service/friendlink.go internal/repository/friendlink.go
git commit -m "feat(friend-link): 新增 status=2 失联状态，ListPublic 返回失联友链"
```

---

## Task 2: API 类型 + client

**Files:**

- Create: `packages/api/src/types/friend-link.ts`
- Modify: `packages/api/src/client.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: 创建类型文件**

新建 `packages/api/src/types/friend-link.ts`：

```typescript
// packages/api/src/types/friend-link.ts
export interface FriendLinkItemResp {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  site: string;
  avatar_url?: string;
  seq: number;
  /** 0=隐藏 1=显示 2=失联 */
  status: 0 | 1 | 2;
  created_at: string;
  updated_at: string;
}

export interface FriendLinkPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: FriendLinkItemResp[];
}

export interface FriendLinkListReq {
  page?: number;
  page_size?: number;
}
```

- [ ] **Step 2: 在 client.ts 添加导入和 friendLinks 命名空间**

`packages/api/src/client.ts`：

在文件顶部 import 块最后一个 `import type` 后面添加：

```typescript
import type {
  FriendLinkItemResp,
  FriendLinkListReq,
  FriendLinkPageResp,
} from "./types/friend-link";
```

在 `createApiClient` return 对象（`guestbook: { ... },` 后面）添加：

```typescript
    friendLinks: {
      /** 查询公开友情链接（含显示和失联状态） */
      listPublic: (req: FriendLinkListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchPublic<FriendLinkPageResp>(`/friend-links${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
    },
```

- [ ] **Step 3: 在 index.ts 导出新类型**

`packages/api/src/index.ts`，在文件末尾追加：

```typescript
export type {
  FriendLinkItemResp,
  FriendLinkPageResp,
  FriendLinkListReq,
} from "./types/friend-link";
```

- [ ] **Step 4: 类型检查**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter @repo/api check-types
```

预期：无错误。

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/types/friend-link.ts packages/api/src/client.ts packages/api/src/index.ts
git commit -m "feat(api): 新增 friendLinks.listPublic 及 FriendLink 类型"
```

---

## Task 3: FadeInUp 公共动效组件

**Files:**

- Modify: `apps/web/app/globals.css`
- Create: `packages/ui/src/fade-in-up.tsx`
- Create: `packages/ui/src/fade-in-up.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: 在 globals.css 添加 keyframe**

`apps/web/app/globals.css`，在已有 `@keyframes slideUpSheet` 块后追加：

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up {
    animation: none;
  }
}
```

- [ ] **Step 2: 写 FadeInUp 测试（先写，再实现）**

新建 `packages/ui/src/fade-in-up.test.tsx`：

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FadeInUp } from "./fade-in-up";

describe("FadeInUp", () => {
  it("渲染 children 内容", () => {
    render(<FadeInUp><span>hello</span></FadeInUp>);
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("默认包含 animate-fade-in-up class", () => {
    const { container } = render(<FadeInUp><span>hi</span></FadeInUp>);
    expect(container.firstChild).toHaveProperty("className");
    expect((container.firstChild as HTMLElement).className).toContain("animate-fade-in-up");
  });

  it("delay prop 注入到 animationDelay style", () => {
    const { container } = render(<FadeInUp delay={150}><span>hi</span></FadeInUp>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDelay).toBe("150ms");
  });

  it("duration prop 注入到 animationDuration style", () => {
    const { container } = render(<FadeInUp duration={600}><span>hi</span></FadeInUp>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDuration).toBe("600ms");
  });

  it("额外 className 被合并", () => {
    const { container } = render(<FadeInUp className="my-class"><span>hi</span></FadeInUp>);
    expect((container.firstChild as HTMLElement).className).toContain("my-class");
  });
});
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm test:run -- packages/ui/src/fade-in-up.test.tsx
```

预期：FAIL，提示模块不存在。

- [ ] **Step 4: 实现 FadeInUp 组件**

新建 `packages/ui/src/fade-in-up.tsx`：

```typescript
import type { CSSProperties, ReactNode } from "react";
import { cn } from "./lib/utils";

interface FadeInUpProps {
  children: ReactNode;
  /** 动画延迟（毫秒），默认 0 */
  delay?: number;
  /** 动画时长（毫秒），默认 400 */
  duration?: number;
  className?: string;
}

export function FadeInUp({ children, delay = 0, duration = 400, className }: FadeInUpProps) {
  const style: CSSProperties = {
    animationDelay: `${delay}ms`,
    animationDuration: `${duration}ms`,
  };

  return (
    <div className={cn("animate-fade-in-up", className)} style={style}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pnpm test:run -- packages/ui/src/fade-in-up.test.tsx
```

预期：5 tests passed。

- [ ] **Step 6: 在 packages/ui/src/index.ts 导出**

在文件末尾追加：

```typescript
export { FadeInUp } from "./fade-in-up";
```

- [ ] **Step 7: 类型检查**

```bash
pnpm --filter @repo/ui check-types
```

预期：无错误。

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/globals.css packages/ui/src/fade-in-up.tsx \
        packages/ui/src/fade-in-up.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): 新增 FadeInUp 入场动效公共组件"
```

---

## Task 4: FriendLinkCard 卡片组件

**Files:**

- Create: `apps/web/components/friend-links/friend-link-card.tsx`
- Create: `apps/web/components/friend-links/friend-link-card.test.tsx`

- [ ] **Step 1: 写测试**

新建 `apps/web/components/friend-links/friend-link-card.test.tsx`：

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinkCard } from "./friend-link-card";

const base: FriendLinkItemResp = {
  id: 1,
  name: "YEVPT Blog",
  description: "我喜欢要么极度悲伤要么淡淡温暖。",
  site: "https://www.yevpt.com",
  seq: 0,
  status: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("FriendLinkCard", () => {
  it("渲染名称和简介", () => {
    render(<FriendLinkCard link={base} />);
    expect(screen.getByText("YEVPT Blog")).toBeTruthy();
    expect(screen.getByText("我喜欢要么极度悲伤要么淡淡温暖。")).toBeTruthy();
  });

  it("status=1 渲染为可点击链接，href 为 site", () => {
    render(<FriendLinkCard link={base} />);
    const anchor = screen.getByRole("link");
    expect(anchor.getAttribute("href")).toBe("https://www.yevpt.com");
    expect(anchor.getAttribute("target")).toBe("_blank");
  });

  it("status=2 不渲染链接，显示「失联」badge", () => {
    render(<FriendLinkCard link={{ ...base, status: 2 }} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("失联")).toBeTruthy();
  });

  it("status=2 卡片带 cursor-not-allowed class", () => {
    const { container } = render(<FriendLinkCard link={{ ...base, status: 2 }} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("cursor-not-allowed");
  });

  it("无 description 时不渲染简介行", () => {
    render(<FriendLinkCard link={{ ...base, description: undefined }} />);
    expect(screen.queryByText("我喜欢要么极度悲伤要么淡淡温暖。")).toBeNull();
  });

  it("无 avatar_url 时渲染首字母占位", () => {
    render(<FriendLinkCard link={{ ...base, avatar_url: undefined }} />);
    expect(screen.getByText("Y")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm test:run -- apps/web/components/friend-links/friend-link-card.test.tsx
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 实现 FriendLinkCard**

新建 `apps/web/components/friend-links/friend-link-card.tsx`：

```typescript
import type { FriendLinkItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { LoadingImage } from "@/components/common/loading-image";

interface FriendLinkCardProps {
  link: FriendLinkItemResp;
}

function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm font-bold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const baseCardClass =
  "flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3.5";

export function FriendLinkCard({ link }: FriendLinkCardProps) {
  const disconnected = link.status === 2;

  const inner = (
    <>
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-[10px]">
        {link.avatar_url ? (
          <LoadingImage
            src={link.avatar_url}
            alt={link.name}
            fill
            className="object-cover"
            skeletonClassName="rounded-[10px]"
            fallbackClassName="rounded-[10px]"
          />
        ) : (
          <AvatarFallback name={link.name} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              disconnected ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {link.name}
          </span>
          {disconnected && (
            <span className="flex-shrink-0 rounded border border-destructive/30 bg-destructive/10 px-1.5 py-px text-[10px] font-semibold text-destructive">
              失联
            </span>
          )}
        </div>
        {link.description && (
          <p className="truncate text-xs text-muted-foreground">{link.description}</p>
        )}
      </div>

      {!disconnected && (
        <SvgIcon
          name="arrow-up-right"
          size={14}
          className="flex-shrink-0 text-muted-foreground/40"
        />
      )}
    </>
  );

  if (disconnected) {
    return (
      <div className={cn(baseCardClass, "cursor-not-allowed opacity-55")}>{inner}</div>
    );
  }

  return (
    <a
      href={link.site}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(baseCardClass, "transition-colors duration-150 hover:border-primary")}
    >
      {inner}
    </a>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm test:run -- apps/web/components/friend-links/friend-link-card.test.tsx
```

预期：6 tests passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/friend-links/friend-link-card.tsx \
        apps/web/components/friend-links/friend-link-card.test.tsx
git commit -m "feat(friend-links): 新增 FriendLinkCard 组件，支持失联状态"
```

---

## Task 5: FriendLinksRulesCard 申请规则卡片

**Files:**

- Create: `apps/web/components/friend-links/friend-links-rules-card.tsx`
- Create: `apps/web/components/friend-links/friend-links-rules-card.test.tsx`

- [ ] **Step 1: 写测试**

新建 `apps/web/components/friend-links/friend-links-rules-card.test.tsx`：

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { FriendLinksRulesCard } from "./friend-links-rules-card";

describe("FriendLinksRulesCard", () => {
  it("默认展开，渲染申请规则内容", () => {
    render(<FriendLinksRulesCard />);
    expect(screen.getByText(/vpt940417@gmail\.com/)).toBeTruthy();
    expect(screen.getByText(/YEVPT/)).toBeTruthy();
    expect(screen.getByText(/注①/)).toBeTruthy();
  });

  it("点击「收起」后隐藏规则内容", async () => {
    render(<FriendLinksRulesCard />);
    const toggleBtn = screen.getByRole("button", { name: /收起/ });
    await userEvent.click(toggleBtn);
    expect(screen.queryByText(/vpt940417@gmail\.com/)).toBeNull();
  });

  it("折叠后点击「展开」重新显示内容", async () => {
    render(<FriendLinksRulesCard />);
    const toggleBtn = screen.getByRole("button", { name: /收起/ });
    await userEvent.click(toggleBtn);
    const expandBtn = screen.getByRole("button", { name: /展开/ });
    await userEvent.click(expandBtn);
    expect(screen.getByText(/vpt940417@gmail\.com/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm test:run -- apps/web/components/friend-links/friend-links-rules-card.test.tsx
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 实现 FriendLinksRulesCard**

新建 `apps/web/components/friend-links/friend-links-rules-card.tsx`：

```typescript
"use client";

import { useState } from "react";

export function FriendLinksRulesCard() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-border bg-secondary px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="text-primary"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-bold text-foreground">交换友链</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={open}
        >
          {open ? "收起 ▲" : "展开 ▼"}
        </button>
      </div>

      {open && (
        <div className="mt-3.5">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            如果要和本站交换友链，请按照以下格式发送到{" "}
            <a
              href="mailto:vpt940417@gmail.com"
              className="text-primary hover:underline"
            >
              vpt940417@gmail.com
            </a>
          </p>

          <div className="mb-3 rounded-md border-l-[3px] border-primary bg-background px-3.5 py-3 font-mono text-xs leading-loose text-foreground">
            <div><span className="text-muted-foreground">博客名字:</span> YEVPT</div>
            <div><span className="text-muted-foreground">博客地址:</span> https://www.yevpt.com</div>
            <div><span className="text-muted-foreground">博客简介:</span> 我喜欢要么极度悲伤要么淡淡温暖。</div>
            <div><span className="text-muted-foreground">博客头像:</span> https://www.yevpt.com/logo.jpg</div>
          </div>

          <ul className="mb-2.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>注① ：希望你的网站非采集以及纯技术站点，且每三个月至少有一次更新。</li>
            <li>注② ：为了更快的效率，请提前加上我的友链，我会在一天内尽快给出答复，谢谢！</li>
          </ul>

          <p className="text-[11px] text-muted-foreground/50">2020-01-19</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pnpm test:run -- apps/web/components/friend-links/friend-links-rules-card.test.tsx
```

预期：3 tests passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/friend-links/friend-links-rules-card.tsx \
        apps/web/components/friend-links/friend-links-rules-card.test.tsx
git commit -m "feat(friend-links): 新增 FriendLinksRulesCard 可折叠规则卡片"
```

---

## Task 6: FriendLinksList + FriendLinksPage 组件

**Files:**

- Create: `apps/web/components/friend-links/friend-links-list.tsx`
- Create: `apps/web/components/friend-links/friend-links-list.test.tsx`
- Create: `apps/web/components/friend-links/friend-links-page.tsx`

- [ ] **Step 1: 写 FriendLinksList 测试**

新建 `apps/web/components/friend-links/friend-links-list.test.tsx`：

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinksList } from "./friend-links-list";

const links: FriendLinkItemResp[] = [
  {
    id: 1, name: "Blog A", site: "https://a.com",
    seq: 0, status: 1, created_at: "", updated_at: "",
  },
  {
    id: 2, name: "Blog B", site: "https://b.com",
    seq: 1, status: 2, created_at: "", updated_at: "",
  },
];

describe("FriendLinksList", () => {
  it("渲染所有友链卡片", () => {
    render(<FriendLinksList links={links} />);
    expect(screen.getByText("Blog A")).toBeTruthy();
    expect(screen.getByText("Blog B")).toBeTruthy();
  });

  it("空列表不崩溃", () => {
    const { container } = render(<FriendLinksList links={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("失联友链显示「失联」badge", () => {
    render(<FriendLinksList links={links} />);
    expect(screen.getByText("失联")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm test:run -- apps/web/components/friend-links/friend-links-list.test.tsx
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 实现 FriendLinksList**

新建 `apps/web/components/friend-links/friend-links-list.tsx`：

```typescript
import type { FriendLinkItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { FriendLinkCard } from "./friend-link-card";

interface FriendLinksListProps {
  links: FriendLinkItemResp[];
}

const MAX_ANIMATED = 10;

export function FriendLinksList({ links }: FriendLinksListProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {links.map((link, index) => (
        <FadeInUp key={link.id} delay={Math.min(index, MAX_ANIMATED - 1) * 50}>
          <FriendLinkCard link={link} />
        </FadeInUp>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 运行 FriendLinksList 测试，确认通过**

```bash
pnpm test:run -- apps/web/components/friend-links/friend-links-list.test.tsx
```

预期：3 tests passed。

- [ ] **Step 5: 实现 FriendLinksPage**

新建 `apps/web/components/friend-links/friend-links-page.tsx`：

```typescript
import type { FriendLinkItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { FriendLinksRulesCard } from "./friend-links-rules-card";
import { FriendLinksList } from "./friend-links-list";

interface FriendLinksPageProps {
  links: FriendLinkItemResp[];
}

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <>
      <div className="mb-8">
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.1em] text-primary">
          友情链接
        </p>
        <h1 className="mb-5 text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
          一些有趣的友邻
        </h1>
        <div className="border-b border-border" />
      </div>

      <FadeInUp delay={0} className="mb-8">
        <FriendLinksRulesCard />
      </FadeInUp>

      <FriendLinksList links={links} />
    </>
  );
}
```

- [ ] **Step 6: 类型检查**

```bash
pnpm --filter web check-types
```

预期：无错误。

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/friend-links/friend-links-list.tsx \
        apps/web/components/friend-links/friend-links-list.test.tsx \
        apps/web/components/friend-links/friend-links-page.tsx
git commit -m "feat(friend-links): 新增 FriendLinksList 和 FriendLinksPage 组件"
```

---

## Task 7: 路由页面 + 组件入口

**Files:**

- Create: `apps/web/components/friend-links/index.ts`
- Create: `apps/web/app/friend-links/page.tsx`
- Create: `apps/web/app/friend-links/page.test.tsx`

- [ ] **Step 1: 写路由页面测试**

新建 `apps/web/app/friend-links/page.test.tsx`：

```typescript
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { FriendLinkPageResp } from "@repo/api";

const emptyResp: FriendLinkPageResp = {
  total: 0, pages: 0, page: 1, page_size: 50, list: [],
};

const linkResp: FriendLinkPageResp = {
  total: 1, pages: 1, page: 1, page_size: 50,
  list: [{
    id: 1, name: "YEVPT Blog", site: "https://www.yevpt.com",
    seq: 0, status: 1, created_at: "", updated_at: "",
  }],
};

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn().mockResolvedValue({
    friendLinks: {
      listPublic: vi.fn().mockResolvedValue(linkResp),
    },
  }),
}));

vi.mock("@/components/friend-links", () => ({
  FriendLinksPage: ({ links }: { links: typeof linkResp.list }) => (
    <main data-testid="friend-links-page">
      {links.map((l) => <span key={l.id}>{l.name}</span>)}
    </main>
  ),
}));

describe("FriendLinksPageRoute", () => {
  it("渲染不崩溃并传入友链数据", async () => {
    const { default: FriendLinksPageRoute } = await import("./page");
    const element = await FriendLinksPageRoute();
    render(element);
    expect(screen.getByTestId("friend-links-page")).toBeTruthy();
    expect(screen.getByText("YEVPT Blog")).toBeTruthy();
  });

  it("API 失败时降级渲染空列表", async () => {
    const { createServerApiClient } = await import("@/lib/server-api");
    vi.mocked(createServerApiClient).mockResolvedValueOnce({
      friendLinks: {
        listPublic: vi.fn().mockRejectedValue(new Error("network error")),
      },
    } as never);

    const { default: FriendLinksPageRoute } = await import("./page");
    const element = await FriendLinksPageRoute();
    render(element);
    expect(screen.getByTestId("friend-links-page")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pnpm test:run -- apps/web/app/friend-links/page.test.tsx
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 创建组件入口**

新建 `apps/web/components/friend-links/index.ts`：

```typescript
export { FriendLinksPage } from "./friend-links-page";
```

- [ ] **Step 4: 实现路由页面**

新建 `apps/web/app/friend-links/page.tsx`：

```typescript
import type { Metadata } from "next";
import type { FriendLinkItemResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { FriendLinksPage } from "@/components/friend-links";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = {
  title: "友邻 | Yevpt's Blog",
  description: "一些有趣的友邻，欢迎交换友链",
};

const EMPTY_LIST: FriendLinkItemResp[] = [];

export default async function FriendLinksPageRoute() {
  const api = await createServerApiClient();
  const resp = await api.friendLinks
    .listPublic({ page: 1, page_size: 50 })
    .catch(() => ({ list: EMPTY_LIST }));

  return (
    <PageContainer>
      <FriendLinksPage links={resp.list} />
    </PageContainer>
  );
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pnpm test:run -- apps/web/app/friend-links/page.test.tsx
```

预期：2 tests passed。

- [ ] **Step 6: 运行全量测试，无回归**

```bash
pnpm test:run
```

预期：所有测试通过，无新增失败。

- [ ] **Step 7: 类型检查**

```bash
pnpm check-types
```

预期：无错误。

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/friend-links/index.ts \
        apps/web/app/friend-links/page.tsx \
        apps/web/app/friend-links/page.test.tsx
git commit -m "feat(friend-links): 新增友邻路由页面，完成完整实现"
```
