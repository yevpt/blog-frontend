"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useNotificationStore } from "@/store/use-notification-store";
import { useNotifications } from "./use-notifications";
import { getNotificationHref } from "./notification-target";
import NotificationCard from "./notification-card";
import NotificationFilterTabs from "./notification-filter-tabs";
import NotificationSelectionBar from "./notification-selection-bar";

export default function NotificationsPage() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const n = useNotifications({ pageSize: 20 });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function openItem(item: NotificationItemResp) {
    if (!item.is_read) await n.markRead(item.id);
    router.push(getNotificationHref(item));
  }

  async function batchRead() {
    await n.markReadBatch([...selected]);
    exitSelect();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-20 md:pt-24 pb-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="hidden text-xl font-medium text-foreground md:block">消息中心</h1>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant={null}
            size={null}
            onPress={() => (selecting ? exitSelect() : setSelecting(true))}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/[0.03]"
          >
            {selecting ? (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border border-current">
                <SvgIcon name="close" size={10} className="stroke-[3]" />
              </span>
            ) : (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border border-current">
                <SvgIcon name="check" size={10} className="stroke-[3]" />
              </span>
            )}
            {selecting ? "取消" : "选择"}
          </Button>
          <Button
            type="button"
            variant={null}
            size={null}
            isDisabled={unreadCount === 0}
            onPress={n.markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            <SvgIcon name="check" size={14} className="stroke-[2.5]" />
            全部已读
          </Button>
        </div>
      </header>

      <NotificationFilterTabs
        unreadOnly={n.unreadOnly}
        unreadCount={unreadCount}
        onChange={(v) => {
          exitSelect();
          n.setUnreadOnly(v);
        }}
      />

      <div className="mt-3.5">
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
        ) : n.loading && n.items.length === 0 ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : n.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <SvgIcon name="bell" size={28} />
            <p className="text-sm">{n.unreadOnly ? "没有未读消息" : "这里还没有消息"}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {n.items.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  selecting={selecting}
                  selected={selected.has(item.id)}
                  onOpen={openItem}
                  onRead={n.markRead}
                  onRemove={n.remove}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
            {n.hasMore && (
              <div className="mt-3.5 flex justify-center">
                <Button
                  type="button"
                  variant={null}
                  size={null}
                  isDisabled={n.loading}
                  onPress={n.loadMore}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2 text-[13px] disabled:opacity-50"
                >
                  {n.loading ? "加载中…" : "加载更多"}
                  {!n.loading && <SvgIcon name="chevron-down" size={15} />}
                </Button>
              </div>
            )}
          </>
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
