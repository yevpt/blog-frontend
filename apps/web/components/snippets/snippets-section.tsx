"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import { CommentModal } from "@/components/comments";
import {
  SidebarFooterButton,
  SidebarSectionAction,
  SidebarSectionFooter,
  SidebarSectionHeader,
} from "@/components/sidebar";
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

// 碎语区块容器：统一标题 header + 卡片堆叠 + 双等宽 CTA 按钮
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

        <SidebarSectionFooter>
          <SidebarFooterButton tone="primary">
            <SvgIcon name="plus" size={12} />
            {t("snippet.postNew")}
          </SidebarFooterButton>
          <SidebarFooterButton tone="ghost">
            {t("snippet.viewMore")}
            <SvgIcon name="arrow-forward" size={12} />
          </SidebarFooterButton>
        </SidebarSectionFooter>
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
