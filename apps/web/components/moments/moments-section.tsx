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
import { useSession } from "@/app/providers/session-provider";
import { useMomentList } from "@/hooks/use-moment-list";
import { useMomentShuffle } from "@/hooks/use-moment-shuffle";
import { useLoginModal } from "@/store/use-login-modal";
import { useMomentModal } from "@/store/use-moment-modal";
import { MomentCard } from "./moment-card";
import { MomentCardSkeleton } from "./moment-card-skeleton";

interface MomentsSectionProps {
  initialMoments: MomentItemResp[];
  loading?: boolean;
  /** 与首页 SSR 查询一致，登录态变化时用于刷新 is_liked */
  ownerUserId?: number;
}

/** 右侧栏最多展示的碎语条数 */
const MAX_MOMENTS = 3;

// 碎语区块容器：统一标题 header + 卡片堆叠 + 双等宽 CTA 按钮
export function MomentsSection({ initialMoments, loading, ownerUserId }: MomentsSectionProps) {
  const { t } = useLocale();
  const { profile } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const openMomentModal = useMomentModal((state) => state.open);
  const initialPage = useMemo<MomentPageResp>(
    () => ({
      total: initialMoments.length,
      pages: 1,
      page: 1,
      page_size: MAX_MOMENTS,
      list: initialMoments,
    }),
    [initialMoments],
  );

  const {
    moments,
    pendingLikeIds,
    pendingActionIds,
    toggleLike,
    updateMoment,
    toggleTop,
    deleteMoment,
    setMoments,
  } = useMomentList({
    initialPage,
    mode: "user",
    userId: ownerUserId,
  });
  const { shuffle, isShuffling } = useMomentShuffle({
    pageSize: MAX_MOMENTS,
    initialMomentIds: initialMoments.map((moment) => moment.id),
    onShuffled: setMoments,
  });
  const [activeComment, setActiveComment] = useState<{ momentId: number } | null>(null);

  const visibleMoments = moments.slice(0, MAX_MOMENTS);
  const openComment = useCallback((moment: MomentItemResp) => {
    setActiveComment({ momentId: moment.id });
  }, []);
  const openEdit = useCallback(
    (moment: MomentItemResp) => {
      openMomentModal(moment, (content, images) => updateMoment(moment, content, images));
    },
    [openMomentModal, updateMoment],
  );
  const closeComment = useCallback(() => {
    setActiveComment(null);
  }, []);
  const handlePostNew = useCallback(() => {
    if (!profile) {
      openLoginModal();
      return;
    }
    openMomentModal();
  }, [openLoginModal, openMomentModal, profile]);
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
          title={t("home.moments")}
          action={
            <SidebarSectionAction
              aria-label={t("moment.shuffle")}
              onPress={shuffle}
              isDisabled={isShuffling}
            >
              <SvgIcon
                name="refresh-cw"
                size={12}
                className={isShuffling ? "animate-spin" : undefined}
              />
              {t("moment.shuffle")}
            </SidebarSectionAction>
          }
        />

        <div className="flex flex-col px-3 pb-3">
          {loading
            ? Array.from({ length: MAX_MOMENTS }, (_, i) => (
                <MomentCardSkeleton key={i} variant={i} layout="embedded" />
              ))
            : visibleMoments.map((moment, index) => (
                <MomentCard
                  key={moment.id}
                  layout="embedded"
                  moment={moment}
                  onLike={toggleLike}
                  likeDisabled={pendingLikeIds.has(moment.id)}
                  onComment={openComment}
                  onEdit={openEdit}
                  onToggleTop={toggleTop}
                  onDelete={deleteMoment}
                  actionDisabled={pendingActionIds.has(moment.id)}
                />
              ))}
        </div>

        <SidebarSectionFooter>
          <SidebarFooterButton tone="primary" onPress={handlePostNew}>
            <SvgIcon name="plus" size={12} />
            {t("moment.postNew")}
          </SidebarFooterButton>
          <SidebarFooterButton tone="ghost" href="/moments">
            {t("moment.viewMore")}
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
