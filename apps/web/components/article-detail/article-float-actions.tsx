"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import { useArticleEngagement } from "@/hooks/use-article-engagement";
import { useActiveArticle } from "@/store/use-active-article";
import { useArticleMusic } from "@/store/use-article-music";
import { ArticleMusicControl } from "./article-music-control";

interface ArticleFloatActionsProps {
  articleId: number;
}

export function ArticleFloatActions({ articleId }: ArticleFloatActionsProps) {
  const { isLiked, isLiking, toggleLike } = useArticleEngagement();
  const patchViewCount = useActiveArticle((state) => state.patchViewCount);
  const hasMusic = Boolean(useArticleMusic((state) => state.track));
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 进入页面后上报一次阅读，成功后更新阅读数
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/articles/${articleId}/view`, { method: "POST", signal: controller.signal })
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data && typeof data.view_count === "number") {
          patchViewCount(data.view_count);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [articleId, patchViewCount]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      {hasMusic ? (
        <div className="hidden md:block">
          <ArticleMusicControl variant="float" />
        </div>
      ) : null}

      <Button
        variant="ghost"
        aria-label={isLiked ? "取消点赞" : "点赞"}
        onPress={() => void toggleLike()}
        isDisabled={isLiking}
        className={`hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-md transition-colors disabled:cursor-not-allowed md:flex ${
          isLiked
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : "border border-border bg-card text-muted-foreground hover:bg-muted"
        }`}
      >
        <span aria-hidden className="text-base">
          {isLiked ? "♥" : "♡"}
        </span>
      </Button>

      <Button
        variant="ghost"
        aria-label="回到顶部"
        onPress={scrollToTop}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-md transition-opacity hover:bg-muted ${
          showScrollTop ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span aria-hidden className="text-sm font-bold">
          ↑
        </span>
      </Button>
    </div>
  );
}
