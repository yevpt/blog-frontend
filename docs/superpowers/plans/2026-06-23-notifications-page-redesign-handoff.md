# Notifications Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the web notification center cards around actor avatar/name, action text/time, lightweight quoted context, and inline like/reply actions for comment-like events.

**Architecture:** Keep the notification page data flow unchanged: `useNotifications` loads `NotificationItemResp`, `NotificationCard` renders one item, and pure helpers derive display text/context/actions from notification fields. Add only frontend types and web UI helpers; do not change backend unless an actual field mismatch is discovered.

**Tech Stack:** Next.js App Router, React, TypeScript, TailwindCSS, Vitest, `@repo/api`, `@repo/ui`, `@repo/icons`.

---

## Backend Reference

Use this backend path only as contract reference: `/Volumes/External/SynologyDrive/Codes/Blog/blog-backend/internal`.

Relevant backend files:
- `/Volumes/External/SynologyDrive/Codes/Blog/blog-backend/internal/dto/notification.go`
- `/Volumes/External/SynologyDrive/Codes/Blog/blog-backend/internal/service/notification/notification.go`
- `/Volumes/External/SynologyDrive/Codes/Blog/blog-backend/internal/service/notification/inbox.go`
- `/Volumes/External/SynologyDrive/Codes/Blog/blog-backend/internal/service/comment/notify.go`

Backend `NotificationItemResp` already exposes:
- `actor_user?: { id, nickname?, avatar_url?, site?, mark? }`
- `root_title?: string`
- `root_excerpt?: string`
- `content_excerpt: string`
- `type`, `source_type`, `source_id`, `root_type`, `root_id`, `created_at`, `is_read`

Backend event types:
- `comment_created`
- `comment_liked`
- `reply_created`
- `reply_liked`
- `article_liked`
- `moment_liked`
- `guestbook_created`
- `guestbook_liked`
- `system_notice`
- `legacy_notice`

## Visual Decision

Implement the approved A2 layout:
- Left column: actor avatar at top, selection checkbox below avatar.
- Main column first row: actor nickname.
- Main column second row: action text + relative time, e.g. `赞了你的文章 9 小时前`.
- Likes of articles/moments: show only a lightweight quote row with object title/excerpt.
- Comments/replies/guestbook messages: show actor content as body text, then a lightweight quote row for the referenced object/content.
- Quote style: no gray card, no big quote mark. Use a thin vertical line and muted text.
- Right column: existing mark-read and delete icon buttons.
- Bottom inline actions: for `comment_created`, `reply_created`, `guestbook_created`, `comment_liked`, `reply_liked`, `guestbook_liked`, render compact `点赞` and `回复` buttons under content. Do not render these buttons for `article_liked`, `moment_liked`, `system_notice`, or `legacy_notice`.

## File Structure

Modify:
- `packages/api/src/types/notification.ts`: add missing backend fields.
- `packages/api/src/client.test.ts`: assert notification list keeps `actor_user` and `root_excerpt`.
- `apps/web/components/notifications/notification-type.ts`: replace/extend display helpers for action text and quote context.
- `apps/web/components/notifications/notification-type.test.ts`: cover event type to action text/context/action availability.
- `apps/web/components/notifications/notification-card.tsx`: implement approved layout.
- `apps/web/components/notifications/notification-card.test.tsx`: update rendering/interaction tests.

Create only if `notification-type.ts` becomes too large:
- `apps/web/components/notifications/notification-display.ts`
- `apps/web/components/notifications/notification-display.test.ts`

Do not add a new shared UI component unless at least two non-notification modules need it.

## Display Rules

Actor:
- Display name: `item.actor_user?.nickname?.trim() || "系统通知"`.
- Avatar source: `item.actor_user?.avatar_url`.
- Avatar component: reuse `UserAvatar` from `apps/web/components/common/user-avatar.tsx`.
- Avatar size: use `lg`.

Action text:
- `article_liked` -> `赞了你的文章`
- `moment_liked` -> `赞了你的碎语`
- `comment_liked` -> `赞了你的评论`
- `reply_liked` -> `赞了你的回复`
- `comment_created` + `root_type=article` -> `评论了你的文章`
- `comment_created` + `root_type=moment` -> `评论了你的碎语`
- `comment_created` + `root_type=guestbook` -> `发表了留言`
- `reply_created` + `root_type=article` -> `回复了文章下你的评论`
- `reply_created` + `root_type=moment` -> `回复了碎语下你的评论`
- `reply_created` + `root_type=guestbook` -> `回复了留言下你的评论`
- `guestbook_created` -> `发表了留言`
- `guestbook_liked` -> `赞了你的留言`
- `system_notice` -> `发布了系统通知`
- `legacy_notice` or unknown -> use `item.title || "你有一条新消息"`; do not duplicate actor name.

Quote content:
- For `article_liked`: quote title is `root_title`; quote text is `root_excerpt || content_excerpt`.
- For `moment_liked`: quote title is `root_title || "碎语"`; quote text is `content_excerpt || root_title`.
- For comments/replies/guestbook messages: body text is `content_excerpt`; quote title is:
  - article root: `root_title ? "《" + root_title + "》" : "文章"`
  - moment root: `root_title || "碎语"`
  - guestbook root: `"留言板"`
  Quote text can be omitted when there is no non-duplicated backend field.
- Never render empty quote rows.

Inline actions:
- Show `点赞` and `回复` only when `type` is comment/reply/guestbook related.
- `点赞` behavior:
  - `source_type=comment`, `root_type=article`: `POST /api/articles/comments/{source_id}/like`
  - `source_type=comment`, `root_type=moment`: `POST /api/moments/comments/{source_id}/like`
  - `source_type=guestbook`: `POST /api/guestbook/{source_id}/like`
  - `source_type=reply`: needs parent comment id. If metadata does not expose parent comment id, render the button disabled with `aria-disabled="true"` and do not guess.
- `回复` behavior:
  - Minimum acceptable first implementation: navigate to `getNotificationHref(item)` so the user can reply in context.
  - Better implementation: if existing comment modal/open-state APIs can be reused safely, open the target comment thread. Do not invent a new global modal in this task.

## Task 1: Update API Types

**Files:**
- Modify: `packages/api/src/types/notification.ts`
- Modify: `packages/api/src/client.test.ts`

- [ ] Step 1: Add actor/root fields to `NotificationItemResp`.

Expected shape:

```ts
export interface NotificationActorUserResp {
  id: number;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
}

export interface NotificationItemResp {
  id: number;
  event_id: number;
  type: string;
  title: string;
  content_excerpt: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  actor_user_id?: number;
  actor_user?: NotificationActorUserResp;
  source_type: string;
  source_id: number;
  root_type: string;
  root_id: number;
  root_title?: string;
  root_excerpt?: string;
  metadata?: string;
}
```

- [ ] Step 2: Extend `packages/api/src/client.test.ts` notification list response test with one list item containing `actor_user` and `root_excerpt`, then assert both fields survive.

- [ ] Step 3: Run:

```bash
pnpm --filter @repo/api test -- client.test.ts
```

Expected: PASS.

## Task 2: Build Pure Display Helpers

**Files:**
- Modify: `apps/web/components/notifications/notification-type.ts`
- Modify: `apps/web/components/notifications/notification-type.test.ts`

- [ ] Step 1: Add exported helper types and functions:

```ts
export interface NotificationQuote {
  title?: string;
  text: string;
}

export interface NotificationInlineActions {
  canLike: boolean;
  canReply: boolean;
}

export function getNotificationActorName(item: NotificationItemResp): string;
export function getNotificationActionText(item: NotificationItemResp): string;
export function getNotificationQuote(item: NotificationItemResp): NotificationQuote | null;
export function getNotificationBodyText(item: NotificationItemResp): string | null;
export function getNotificationInlineActions(item: NotificationItemResp): NotificationInlineActions;
```

- [ ] Step 2: Implement the display rules above with early returns and exact string comparisons for known event types.

- [ ] Step 3: Keep old helpers only if still used. Remove unused `TONE_CLASS`/visual pill logic from card usage if the redesigned card no longer needs event pills.

- [ ] Step 4: Add tests covering:
  - `article_liked` uses `root_title` + `root_excerpt`.
  - `moment_liked` uses `root_title` or `content_excerpt`.
  - `comment_created` on article returns `评论了你的文章`, body text, and quote title.
  - `reply_created` on article returns `回复了文章下你的评论`.
  - `guestbook_created` returns `发表了留言`.
  - `comment_liked` returns `赞了你的评论`.
  - unknown type falls back to `title`.
  - inline actions are false for article/moment likes and true for comment/reply/guestbook events.

- [ ] Step 5: Run:

```bash
pnpm --filter web test -- notification-type.test.ts
```

Expected: PASS.

## Task 3: Redesign NotificationCard Markup

**Files:**
- Modify: `apps/web/components/notifications/notification-card.tsx`
- Modify: `apps/web/components/notifications/notification-card.test.tsx`

- [ ] Step 1: Import `UserAvatar` and new display helpers.

Use:

```ts
import { UserAvatar } from "@/components/common/user-avatar";
```

- [ ] Step 2: Replace the event-icon-first layout with:
  - root `div`: `group grid grid-cols-[2.625rem_minmax(0,1fr)_2rem] gap-3 rounded-xl border px-3.5 py-3 transition-colors`
  - unread class: `border-border bg-muted/55 dark:bg-muted/60`
  - read class: `border-border/60 bg-card`
  - avatar column with `UserAvatar size="lg"` and checkbox below.
  - clickable main `button` wrapping actor/action/body/quote/actions.
  - right operation column unchanged in behavior.

- [ ] Step 3: Render actor/action:

```tsx
<span className="flex min-w-0 items-center gap-2">
  {unread && <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" aria-hidden />}
  <span className="truncate text-sm font-medium text-foreground">{actorName}</span>
</span>
<span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" title={created ? formatDateTime(created) : undefined}>
  <span className="font-medium text-foreground/75">{actionText}</span>
  {created && <span>{formatRelativeTime(created)}</span>}
</span>
```

- [ ] Step 4: Render body text only when non-empty:

```tsx
{bodyText && (
  <span className="mt-2 line-clamp-2 block text-[13px] leading-relaxed text-foreground/80">
    {bodyText}
  </span>
)}
```

- [ ] Step 5: Render lightweight quote only when helper returns non-null:

```tsx
{quote && (
  <span className="mt-2 grid grid-cols-[0.875rem_minmax(0,1fr)] gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
    <span className="my-0.5 w-0.5 rounded-full bg-border justify-self-center" aria-hidden />
    <span className="min-w-0">
      {quote.title && <span className="mb-0.5 block truncate font-medium text-foreground/60">{quote.title}</span>}
      <span className="line-clamp-2">{quote.text}</span>
    </span>
  </span>
)}
```

- [ ] Step 6: Render inline bottom actions when helper allows them:

```tsx
{(inlineActions.canLike || inlineActions.canReply) && (
  <span className="mt-2 flex items-center gap-1.5">
    {inlineActions.canLike && (
      <Button type="button" variant={null} size={null} onPress={handleInlineLike} className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-foreground/[0.04]">
        <SvgIcon name="heart-line" size={13} />
        点赞
      </Button>
    )}
    {inlineActions.canReply && (
      <Button type="button" variant={null} size={null} onPress={handleInlineReply} className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-foreground/[0.04]">
        <SvgIcon name="message-circle-line" size={13} />
        回复
      </Button>
    )}
  </span>
)}
```

- [ ] Step 7: Prevent inline action clicks from opening the card body. Use handlers that stop propagation. If using React Aria `Button`, pass click-safe logic through `onPress` and ensure tests verify `onOpen` is not called.

- [ ] Step 8: Update tests:
  - actor nickname renders.
  - avatar image renders when `actor_user.avatar_url` exists.
  - action text/time renders.
  - article like renders quote title and `root_excerpt`.
  - comment created renders body text, quote title, `点赞`, `回复`.
  - article/moment like does not render inline `点赞/回复`.
  - selecting mode body click still toggles select instead of opening.
  - right delete/read buttons still call existing callbacks.

- [ ] Step 9: Run:

```bash
pnpm --filter web test -- notification-card.test.tsx
```

Expected: PASS.

## Task 4: Wire Minimal Inline Action Behavior

**Files:**
- Modify: `apps/web/components/notifications/notification-card.tsx`
- Modify: `apps/web/components/notifications/notifications-page.tsx`
- Modify: `apps/web/components/notifications/notification-card.test.tsx`

- [ ] Step 1: Add optional props:

```ts
onInlineLike?: (item: NotificationItemResp) => void | Promise<void>;
onInlineReply?: (item: NotificationItemResp) => void;
```

- [ ] Step 2: In `NotificationsPage`, implement:
  - `onInlineReply`: `router.push(getNotificationHref(item))`.
  - `onInlineLike`: call a new local function that uses `apiJson` for supported source/root pairs and no-ops for unsupported reply likes without parent comment id.

- [ ] Step 3: Supported like URLs:

```ts
function getNotificationLikeUrl(item: NotificationItemResp): string | null {
  if (item.source_type === "comment" && item.root_type === "article") return `/api/articles/comments/${item.source_id}/like`;
  if (item.source_type === "comment" && item.root_type === "moment") return `/api/moments/comments/${item.source_id}/like`;
  if (item.source_type === "guestbook") return `/api/guestbook/${item.source_id}/like`;
  return null;
}
```

- [ ] Step 4: On unsupported like URL, keep the button disabled or hidden. Prefer hidden if the helper cannot safely determine the endpoint.

- [ ] Step 5: On supported like success, do not mutate notification content. This page is not the canonical like count UI.

- [ ] Step 6: Run:

```bash
pnpm --filter web test -- notifications-page.test.tsx notification-card.test.tsx
```

Expected: PASS.

## Task 5: Final Verification

**Files:**
- No new files unless Task 2 split helpers.

- [ ] Step 1: Run targeted notification tests:

```bash
pnpm --filter web test -- notification-type.test.ts notification-card.test.tsx notifications-page.test.tsx use-notifications.test.ts
```

Expected: PASS.

- [ ] Step 2: Run API package targeted test:

```bash
pnpm --filter @repo/api test -- client.test.ts
```

Expected: PASS.

- [ ] Step 3: Run type/lint check if package scripts exist:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

If either script does not exist, record the missing script and run the closest existing package check from `package.json`.

- [ ] Step 4: Start the dev server and inspect `/notifications` with seeded or mocked notification data:

```bash
pnpm --filter web dev
```

Expected visual result: actor avatar/name first, A2 lightweight quote, right read/delete controls, selection checkbox under avatar, inline like/reply only on comment/reply/guestbook events.

## Direct Prompt For A Worker

```text
You are working in /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend.

Implement docs/superpowers/plans/2026-06-23-notifications-page-redesign-handoff.md exactly.

Important constraints:
- Read AGENTS.md and the relevant skills before editing: building-ui, writing-tests, extending-api if you touch @repo/api behavior.
- Reuse existing components: Button/SvgIcon/UserAvatar/cn. Do not hand-roll base buttons or inline SVG.
- Do not change backend code. Use /Volumes/External/SynologyDrive/Codes/Blog/blog-backend/internal only as API contract reference.
- Update TypeScript types for backend notification fields: actor_user, root_excerpt.
- Implement the approved A2 notification card layout: avatar + selection on left, actor/action/time in main column, lightweight quote with thin vertical line, right read/delete buttons, inline like/reply only for comment/reply/guestbook events.
- Keep tests mandatory. Update or add tests for helper mapping, card rendering, and page wiring.
- Avoid any. Use precise types.
- Do not revert unrelated user changes.

Required verification before final:
pnpm --filter web test -- notification-type.test.ts notification-card.test.tsx notifications-page.test.tsx use-notifications.test.ts
pnpm --filter @repo/api test -- client.test.ts

Final response must summarize changed files, tests run, and any remaining risk.
```
