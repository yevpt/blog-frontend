"use client";

import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import type { ReplyEditTarget } from "@/components/comments";
import { Card, Pagination } from "@repo/ui";
import type { RefObject } from "react";
import { CommentItemSkeleton, type ReplyTarget } from "@/components/comments";
import { GuestbookItem } from "./guestbook-item";

/** 与 use-guestbook-list 的 PAGE_SIZE 保持一致 */
const SKELETON_ITEM_COUNT = 20;

function GuestbookSkeleton({ count = SKELETON_ITEM_COUNT }: { count?: number }) {
  return (
    <div aria-label="加载中" className="divide-y divide-border px-[18px]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pt-4 pb-2">
          <CommentItemSkeleton />
        </div>
      ))}
    </div>
  );
}

interface GuestbookListProps {
  items: GuestbookItemResp[];
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onReply: (target: ReplyTarget) => void;
  onLike: (id: number) => void;
  currentUserId?: number | null;
  onDelete?: (id: number) => Promise<boolean>;
  onDeleteReply?: (itemId: number, replyId: number) => Promise<boolean>;
  onEdit?: (id: number, content: string) => Promise<boolean>;
  onEditReply?: (target: ReplyEditTarget) => void;
  pendingReplies: Record<number, CommentReplyResp | null>;
  editedReplies?: Record<number, CommentReplyResp | null>;
  listRef?: RefObject<HTMLDivElement | null>;
}

export function GuestbookList({
  items,
  page,
  totalPages,
  total,
  isLoading,
  error,
  onPageChange,
  onReply,
  onLike,
  currentUserId,
  onDelete,
  onDeleteReply,
  onEdit,
  onEditReply,
  pendingReplies,
  editedReplies,
  listRef,
}: GuestbookListProps) {
  return (
    <>
      <Card ref={listRef} className="overflow-hidden">
        {isLoading ? (
          <GuestbookSkeleton />
        ) : error ? (
          <div className="px-[18px]">
            <p className="py-6 text-center text-sm text-(--fg3)">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-[18px]">
            <p className="py-10 text-center text-sm text-(--fg3)">还没有留言，来第一个吧 👋</p>
          </div>
        ) : (
          <div className="divide-y divide-border px-[18px]">
            {items.map((item) => (
              <GuestbookItem
                key={item.id}
                item={item}
                onReply={onReply}
                onLike={onLike}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onDeleteReply={onDeleteReply}
                onEdit={onEdit}
                onEditReply={onEditReply}
                pendingReply={pendingReplies[item.id] ?? null}
                editedReply={editedReplies?.[item.id] ?? null}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-[18px]">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              className="pt-3 pb-3 md:pt-3"
            />
          </div>
        )}
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-center gap-3 pt-4 text-[12px] tracking-[0.02em] text-(--fg3)">
          <span className="h-px w-14 flex-none bg-gradient-to-r from-transparent via-border to-transparent" />
          <span>{total} 条留言</span>
          <span className="h-px w-14 flex-none bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}
    </>
  );
}
