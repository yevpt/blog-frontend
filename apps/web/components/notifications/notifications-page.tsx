"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CommentLikeResp, NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, Tooltip, cn } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { apiJson } from "@/lib/client-fetch";
import { useNotificationStore } from "@/store/use-notification-store";
import { useNotifications } from "./use-notifications";
import { getNotificationHref } from "./notification-target";
import { getNotificationLikeUrl } from "./notification-type";
import { NotificationVirtualList } from "./notification-virtual-list";
import NotificationFilterTabs from "./notification-filter-tabs";
import NotificationSelectionBar from "./notification-selection-bar";
import { MarkAllReadButton } from "./mark-all-read-button";
import { useNotificationInlineReply } from "./use-notification-inline-reply";

const INITIAL_SKELETON_COUNT = 8;

const HEADER_ICON_BTN_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:bg-foreground/[0.04] disabled:opacity-50";

interface NotificationHeaderIconButtonProps {
  label: string;
  icon: ReactNode;
  isDisabled?: boolean;
  isActive?: boolean;
  onPress: () => void;
}

function NotificationHeaderIconButton({
  label,
  icon,
  isDisabled,
  isActive,
  onPress,
}: NotificationHeaderIconButtonProps) {
  return (
    <Tooltip title={label} placement="top" delay={200}>
      <Button
        type="button"
        variant={null}
        size={null}
        aria-label={label}
        isDisabled={isDisabled}
        onPress={onPress}
        className={cn(
          HEADER_ICON_BTN_CLASS,
          isActive && "border-primary bg-primary/5 text-primary hover:bg-primary/10",
        )}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

function NotificationSkeletonCard() {
  return (
    <div
      data-testid="notification-skeleton-card"
      className="grid grid-cols-[2.625rem_minmax(0,1fr)_2rem] gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
    >
      <div className="flex flex-col items-center gap-2">
        <span className="h-10 w-10 animate-pulse rounded-full bg-muted/60" />
        <span className="h-4 w-4 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-muted/60" />
          <span className="h-4 w-24 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="mt-1.5 h-3.5 w-36 animate-pulse rounded bg-muted/50" />
        <div className="mt-2 h-3.5 w-[92%] animate-pulse rounded bg-muted/50" />
        <div className="mt-1.5 h-3.5 w-[70%] animate-pulse rounded bg-muted/45" />
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-6 w-16 animate-pulse rounded-md bg-muted/55" />
          <span className="h-6 w-16 animate-pulse rounded-md bg-muted/55" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 self-start">
        <span className="h-[26px] w-[26px] animate-pulse rounded-md border border-border bg-muted/55" />
      </div>
    </div>
  );
}

function NotificationSkeletonList() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col gap-2"
      data-testid="notification-skeleton-region"
      aria-hidden
    >
      {Array.from({ length: INITIAL_SKELETON_COUNT }, (_, i) => (
        <NotificationSkeletonCard key={i} />
      ))}
      <div className="min-h-32 flex-1 rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="h-3.5 w-[45%] animate-pulse rounded bg-muted/45" />
        <div className="mt-2 h-3.5 w-[72%] animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { userId } = useSession();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const n = useNotifications({ pageSize: 20 });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelecting(false);
    setSelected(new Set());
  }, [userId]);

  const handleReplySuccess = useCallback(
    (id: number, replyCount: number) => {
      n.updateItemEngagement(id, { reply_count: replyCount });
    },
    [n],
  );

  const { submitReply, submittingId } = useNotificationInlineReply({
    markRead: n.markRead,
    onReplySuccess: handleReplySuccess,
  });

  function toggleSelect(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelecting(true);
  }

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function openItem(item: NotificationItemResp) {
    if (!item.is_read) await n.markRead(item.id);
    router.push(getNotificationHref(item));
  }

  function handleInlineReplySubmit(item: NotificationItemResp, content: string) {
    return submitReply(item, content);
  }

  async function handleInlineLike(item: NotificationItemResp) {
    const url = getNotificationLikeUrl(item);
    if (!url) return;
    try {
      if (!item.is_read) await n.markRead(item.id);
      const result = await apiJson<CommentLikeResp>(url, { method: "POST" });
      n.updateItemEngagement(item.id, {
        is_liked: result.is_liked,
        like_count: result.like_count,
      });
    } catch {
      // 点赞失败不改动通知列表展示
    }
  }

  function toggleSelectMode() {
    if (selecting) exitSelect();
    else setSelecting(true);
  }

  async function batchRead() {
    await n.markReadBatch([...selected]);
    exitSelect();
  }

  const isInitialLoading = !n.error && n.loading && n.items.length === 0;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pt-[4.75rem] pb-8 md:pt-20">
      <header className="mb-2 hidden md:block">
        <h1 className="text-xl font-medium text-foreground">消息中心</h1>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-border">
        <NotificationFilterTabs
          unreadOnly={n.unreadOnly}
          unreadCount={unreadCount}
          onChange={(v) => {
            exitSelect();
            n.setUnreadOnly(v);
          }}
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationHeaderIconButton
            label={selecting ? "取消选择" : "批量选择"}
            icon={<SvgIcon name="list-checks" size={14} />}
            isActive={selecting}
            isDisabled={!selecting && n.items.length === 0}
            onPress={toggleSelectMode}
          />
          <MarkAllReadButton unreadCount={unreadCount} onConfirm={n.markAllRead} />
        </div>
      </div>

      <div className="mt-3.5 flex min-h-0 flex-1 flex-col">
        {n.error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <p className="text-sm">加载失败了</p>
            <Button
              type="button"
              variant={null}
              size={null}
              onPress={n.reload}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              <SvgIcon name="refresh-cw" size={15} />
              重试
            </Button>
          </div>
        ) : isInitialLoading ? (
          <NotificationSkeletonList />
        ) : n.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <SvgIcon name="bell" size={28} />
            <p className="text-sm">{n.unreadOnly ? "没有未读消息" : "这里还没有消息"}</p>
          </div>
        ) : (
          <div className="min-h-full flex-1">
            <NotificationVirtualList
              items={n.items}
              enteringIds={n.enteringIds}
              staggerAnimateIds={n.staggerAnimateIds}
              selecting={selecting}
              selected={selected}
              hasMore={n.hasMore}
              loading={n.loading}
              onLoadMore={n.loadMore}
              onOpen={openItem}
              onRead={n.markRead}
              onToggleSelect={toggleSelect}
              onInlineLike={handleInlineLike}
              onInlineReplySubmit={handleInlineReplySubmit}
              replyingId={submittingId}
            />
          </div>
        )}
      </div>

      {selecting && (
        <NotificationSelectionBar
          count={selected.size}
          onMarkRead={batchRead}
          onCancel={exitSelect}
        />
      )}
    </main>
  );
}
