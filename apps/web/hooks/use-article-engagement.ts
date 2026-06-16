"use client";

import { useCallback, useState } from "react";
import type { ArticleLikeResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { addToast } from "@/lib/toast";
import { apiJson, ApiClientError } from "@/lib/client-fetch";
import { useActiveArticle } from "@/store/use-active-article";
import { useLoginModal } from "@/store/use-login-modal";

export function useArticleEngagement() {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const articleId = useActiveArticle((state) => state.articleId);
  const likeCount = useActiveArticle((state) => state.likeCount);
  const commentCount = useActiveArticle((state) => state.commentCount);
  const isLiked = useActiveArticle((state) => state.isLiked);
  const patchLike = useActiveArticle((state) => state.patchLike);
  const [isLiking, setIsLiking] = useState(false);

  const toggleLike = useCallback(async () => {
    if (!articleId) return;
    if (!userId) {
      openLoginModal();
      return;
    }
    if (isLiking) return;

    setIsLiking(true);

    try {
      const data = await apiJson<ArticleLikeResp>(`/api/articles/${articleId}/like`, {
        method: "POST",
      });
      patchLike({ likeCount: data.like_count, isLiked: data.is_liked });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        openLoginModal();
        return;
      }
      addToast("点赞失败，请稍后重试", "error");
    } finally {
      setIsLiking(false);
    }
  }, [articleId, isLiking, openLoginModal, patchLike, userId]);

  return {
    articleId,
    likeCount,
    commentCount,
    isLiked,
    isLiking,
    toggleLike,
  };
}
