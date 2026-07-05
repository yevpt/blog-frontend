"use client";

import { useCallback } from "react";
import type { MomentItemResp } from "@repo/api";
import { useMomentModal } from "@/store/use-moment-modal";
import { useMomentDetail } from "@/hooks/use-moment-detail";
import { MomentCard } from "./moment-card";

interface MomentDetailProps {
  initialMoment: MomentItemResp;
}

/** 评论按钮点击滚动到下方内联评论区，而非像列表页那样打开评论弹窗 */
function scrollToComments() {
  document.getElementById("moment-detail-comments")?.scrollIntoView({ behavior: "smooth" });
}

export function MomentDetail({ initialMoment }: MomentDetailProps) {
  const { moment, likePending, actionPending, toggleLike, updateMoment, toggleTop, deleteMoment } =
    useMomentDetail(initialMoment);
  const openMomentModal = useMomentModal((state) => state.open);

  const openEdit = useCallback(() => {
    openMomentModal(moment, updateMoment);
  }, [moment, openMomentModal, updateMoment]);

  return (
    <MomentCard
      moment={moment}
      layout="standalone"
      onLike={toggleLike}
      likeDisabled={likePending}
      onComment={scrollToComments}
      onEdit={openEdit}
      onToggleTop={toggleTop}
      onDelete={deleteMoment}
      actionDisabled={actionPending}
    />
  );
}
