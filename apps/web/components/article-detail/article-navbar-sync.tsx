"use client";

import { useEffect } from "react";
import { useActiveArticle } from "@/store/use-active-article";

interface ArticleNavbarSyncProps {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export function ArticleNavbarSync({
  articleId,
  likeCount,
  commentCount,
  isLiked,
}: ArticleNavbarSyncProps) {
  const syncArticle = useActiveArticle((state) => state.syncArticle);
  const clearArticle = useActiveArticle((state) => state.clearArticle);

  useEffect(() => {
    syncArticle({ articleId, likeCount, commentCount, isLiked });

    return () => {
      clearArticle();
    };
  }, [articleId, commentCount, isLiked, likeCount, clearArticle, syncArticle]);

  return null;
}
