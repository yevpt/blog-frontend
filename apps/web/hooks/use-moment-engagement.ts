"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MomentItemResp, MomentLikeResp, MomentPageResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";

export interface MomentRefreshParams {
  page: number;
  pageSize: number;
}

interface UseMomentEngagementOptions {
  initialMoments: MomentItemResp[];
  ownerUserId?: number;
  getRefreshParams: () => MomentRefreshParams;
  onRefresh?: (data: MomentPageResp) => void;
}

interface ActiveComment {
  momentId: number;
}

export function useMomentEngagement({
  initialMoments,
  ownerUserId,
  getRefreshParams,
  onRefresh,
}: UseMomentEngagementOptions) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const [moments, setMoments] = useState(initialMoments);
  const [activeComment, setActiveComment] = useState<ActiveComment | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<number[]>([]);
  const prevUserIdRef = useRef<number | null>(userId);
  const getRefreshParamsRef = useRef(getRefreshParams);
  const onRefreshRef = useRef(onRefresh);

  getRefreshParamsRef.current = getRefreshParams;
  onRefreshRef.current = onRefresh;

  const fetchMoments = useCallback(async () => {
    try {
      const { page, pageSize } = getRefreshParamsRef.current();
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (ownerUserId !== undefined) {
        params.set("user_id", String(ownerUserId));
      }
      const res = await fetch(`/api/moments?${params.toString()}`);
      if (!res.ok) return null;
      const data: MomentPageResp = await res.json();
      setMoments(data.list);
      onRefreshRef.current?.(data);
      return data;
    } catch {
      return null;
    }
  }, [ownerUserId]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      return;
    }
    prevUserIdRef.current = userId;
    void fetchMoments();
  }, [fetchMoments, userId]);

  const handleCommentAdded = useCallback(() => {
    if (!activeComment) return;
    setMoments((current) =>
      current.map((item) =>
        item.id === activeComment.momentId
          ? { ...item, comment_count: item.comment_count + 1 }
          : item,
      ),
    );
  }, [activeComment]);

  const openComment = useCallback((snippet: MomentItemResp) => {
    setActiveComment({ momentId: snippet.id });
  }, []);

  const closeComment = useCallback(() => {
    setActiveComment(null);
  }, []);

  const handleLike = useCallback(
    async (snippet: MomentItemResp) => {
      if (userId == null) {
        openLoginModal();
        return;
      }
      if (pendingLikeIds.includes(snippet.id)) {
        return;
      }

      setPendingLikeIds((current) => [...current, snippet.id]);
      try {
        const res = await fetch(`/api/moments/${snippet.id}/like`, { method: "POST" });
        if (res.status === 401) {
          openLoginModal();
          return;
        }
        if (!res.ok) {
          throw new Error("failed");
        }

        const data: MomentLikeResp = await res.json();
        setMoments((current) =>
          current.map((item) =>
            item.id === snippet.id
              ? { ...item, is_liked: data.is_liked, like_count: data.like_count }
              : item,
          ),
        );
      } catch {
        addToast(snippet.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试", "error");
      } finally {
        setPendingLikeIds((current) => current.filter((id) => id !== snippet.id));
      }
    },
    [openLoginModal, pendingLikeIds, userId],
  );

  return {
    moments,
    setMoments,
    activeComment,
    pendingLikeIds,
    handleLike,
    openComment,
    closeComment,
    handleCommentAdded,
    fetchMoments,
  };
}
