"use client";

import { useEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import {
  floatDockHeartbeatClass,
  floatDockIconSize,
  floatDockOrbClass,
  floatDockOrbLikedClass,
} from "@/components/float-dock";
import { useArticleEngagement } from "@/hooks/use-article-engagement";
import { ArticleLikeCountFloat } from "./article-like-count-float";

/** 文章页浮动点赞钮（含上浮数字动效） */
export function ArticleFloatLikeOrb() {
  const { likeCount, isLiked, isLiking, toggleLike } = useArticleEngagement();
  const [likeFloatCount, setLikeFloatCount] = useState<number | null>(null);
  const pendingFloatLikeRef = useRef(false);
  const prevLikeCountRef = useRef(likeCount);

  const handleFloatLike = async () => {
    if (isLiking) return;
    if (!isLiked) {
      pendingFloatLikeRef.current = true;
      prevLikeCountRef.current = likeCount;
    }
    await toggleLike();
  };

  useEffect(() => {
    if (!pendingFloatLikeRef.current || isLiking) return;

    if (isLiked) {
      pendingFloatLikeRef.current = false;
      const optimisticCount =
        likeCount > prevLikeCountRef.current ? likeCount : prevLikeCountRef.current + 1;
      setLikeFloatCount(optimisticCount);
      return;
    }

    pendingFloatLikeRef.current = false;
  }, [isLiked, isLiking, likeCount]);

  return (
    <div className="relative">
      {likeFloatCount !== null ? (
        <ArticleLikeCountFloat count={likeFloatCount} onComplete={() => setLikeFloatCount(null)} />
      ) : null}
      <Button
        variant="ghost"
        aria-label={isLiked ? "取消点赞" : "点赞"}
        aria-pressed={isLiked}
        onPress={() => void handleFloatLike()}
        isDisabled={isLiking}
        className={cn(floatDockOrbClass, isLiked && floatDockOrbLikedClass)}
      >
        <span className={isLiked ? floatDockHeartbeatClass : undefined}>
          <SvgIcon
            name={isLiked ? "heart-fill" : "heart-line"}
            size={floatDockIconSize}
            aria-hidden
          />
        </span>
      </Button>
    </div>
  );
}
