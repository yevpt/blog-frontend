"use client";

import { useLayoutEffect } from "react";
import { useActiveArticle } from "@/store/use-active-article";

interface ArticleNavbarSyncProps {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  readCount: number;
}

export function ArticleNavbarSync({
  articleId,
  likeCount,
  commentCount,
  isLiked,
  readCount,
}: ArticleNavbarSyncProps) {
  const syncArticle = useActiveArticle((state) => state.syncArticle);
  const clearArticle = useActiveArticle((state) => state.clearArticle);

  // 必须在首屏绘制前把文章信息写入 store，避免移动端头部先闪出默认的 0/0。
  useLayoutEffect(() => {
    syncArticle({ articleId, likeCount, commentCount, isLiked, readCount });

    return () => {
      clearArticle();
    };
  }, [articleId, commentCount, isLiked, likeCount, readCount, clearArticle, syncArticle]);

  return null;
}
