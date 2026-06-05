"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import type { ArticleLikeResp } from "@repo/api";
import { MusicPlayer } from "./music-player";

interface ArticleFloatActionsProps {
  articleId: number;
  initialLikeCount: number;
  initialIsLiked: boolean;
  musicUrl?: string;
  musicName?: string;
}

export function ArticleFloatActions({
  articleId,
  initialLikeCount,
  initialIsLiked,
  musicUrl,
  musicName,
}: ArticleFloatActionsProps) {
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  // likeCount 保留为未来展示用；当前版本仅追踪 is_liked 状态
  const [, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);
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

  const handleLike = useCallback(async () => {
    if (!userId) {
      openLoginModal();
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/like`, { method: "POST" });
      if (res.status === 401) {
        openLoginModal();
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data: ArticleLikeResp = await res.json();
      setIsLiked(data.is_liked);
      setLikeCount(data.like_count);
    } catch {
      addToast("点赞失败，请稍后重试", "error");
    } finally {
      setIsLiking(false);
    }
  }, [articleId, isLiking, openLoginModal, userId]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
      <MusicPlayer url={musicUrl} name={musicName} />

      <button
        aria-label={isLiked ? "取消点赞" : "点赞"}
        onClick={handleLike}
        disabled={isLiking}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-md transition-colors disabled:cursor-not-allowed ${
          isLiked
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : "border border-border bg-card text-muted-foreground hover:bg-muted"
        }`}
      >
        <span aria-hidden className="text-base">
          {isLiked ? "♥" : "♡"}
        </span>
      </button>

      <button
        aria-label="回到顶部"
        onClick={scrollToTop}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-md transition-opacity hover:bg-muted ${
          showScrollTop ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span aria-hidden className="text-sm font-bold">
          ↑
        </span>
      </button>
    </div>
  );
}
