"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import { CommentModal } from "@/components/comments";
import { SidebarSectionAction, SidebarSectionHeader } from "@/components/sidebar";
import { useMomentList } from "@/hooks/use-moment-list";
import { SnippetCard } from "./snippet-card";
import { SnippetCardSkeleton } from "./snippet-card-skeleton";

interface SnippetsSectionProps {
  snippets: MomentItemResp[];
  loading?: boolean;
  /** 与首页 SSR 查询一致，登录态变化时用于刷新 is_liked */
  ownerUserId?: number;
}

/** 右侧栏最多展示的碎语条数 */
const MAX_SNIPPETS = 3;

// 碎语区块容器：渐变图标 header + 卡片堆叠 + 渐变 CTA 按钮
export function SnippetsSection({ snippets, loading, ownerUserId }: SnippetsSectionProps) {
  const { t } = useLocale();
  const initialPage = useMemo<MomentPageResp>(
    () => ({
      total: snippets.length,
      pages: 1,
      page: 1,
      page_size: MAX_SNIPPETS,
      list: snippets,
    }),
    [snippets],
  );

  const { moments, pendingLikeIds, toggleLike, setMoments } = useMomentList({
    initialPage,
    ownerUserId,
    initialTab: ownerUserId === undefined ? "all" : "owner",
  });
  const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);

  const visibleSnippets = moments.slice(0, MAX_SNIPPETS);
  const openComment = useCallback((snippet: MomentItemResp) => {
    setActiveComment({ momentId: snippet.id });
  }, []);
  const closeComment = useCallback(() => {
    setActiveComment(null);
  }, []);
  const handleCommentAdded = useCallback(() => {
    if (!activeComment) return;
    setMoments((current) =>
      current.map((item) =>
        item.id === activeComment.momentId
          ? { ...item, comment_count: item.comment_count + 1 }
          : item,
      ),
    );
  }, [activeComment, setMoments]);

  return (
    <>
      <section className="overflow-hidden rounded-2xl bg-card shadow-card">
        <SidebarSectionHeader
          title={t("home.snippets")}
          action={
            <SidebarSectionAction aria-label={t("snippet.shuffle")}>
              <SvgIcon name="refresh-cw" size={12} />
              {t("snippet.shuffle")}
            </SidebarSectionAction>
          }
        />

        <div className="flex flex-col px-3 pb-3">
          {loading
            ? Array.from({ length: MAX_SNIPPETS }, (_, i) => (
                <SnippetCardSkeleton key={i} variant={i} layout="embedded" />
              ))
            : visibleSnippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  layout="embedded"
                  snippet={snippet}
                  onLike={toggleLike}
                  likeDisabled={pendingLikeIds.has(snippet.id)}
                  onComment={openComment}
                />
              ))}
        </div>

        <div className="flex gap-2 border-t border-border/40 px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 rounded-xl border-none bg-gradient-to-r from-primary to-primary/90 text-xs font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.25)] hover:opacity-90"
          >
            {t("snippet.postNew")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 flex-1 rounded-xl border border-border/60 text-xs font-medium text-(--fg2) hover:border-primary/30 hover:text-primary"
          >
            {t("snippet.viewMore")} →
          </Button>
        </div>
      </section>

      {activeComment !== null && (
        <CommentModal
          targetType="moment"
          targetId={activeComment.momentId}
          onClose={closeComment}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </>
  );
}
