"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import { useArticleEngagement } from "@/hooks/use-article-engagement";
import { MusicPlayer } from "./music-player";

interface ArticleFloatActionsProps {
  articleId: number;
  musicUrl?: string;
  musicName?: string;
}

export function ArticleFloatActions({ articleId, musicUrl, musicName }: ArticleFloatActionsProps) {
  const { isLiked, isLiking, toggleLike } = useArticleEngagement();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 进入页面后上报一次阅读（fire-and-forget）
  useEffect(() => {
    void fetch(`/api/articles/${articleId}/view`, { method: "POST" });
  }, [articleId]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      <MusicPlayer url={musicUrl} name={musicName} />

      <Button
        variant="ghost"
        aria-label={isLiked ? "取消点赞" : "点赞"}
        onPress={() => void toggleLike()}
        isDisabled={isLiking}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-md transition-colors disabled:cursor-not-allowed ${
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
