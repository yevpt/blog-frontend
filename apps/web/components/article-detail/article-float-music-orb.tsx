"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@repo/ui";
import { floatDockOrbHiddenClass } from "@/components/float-dock";
import { useArticleMusic } from "@/store/use-article-music";
import { ArticleMusicControl } from "./article-music-control";

/** 配乐条重新进入视口后延迟隐藏浮动钮，避免边界来回滚动时栈布局抖动 */
const MUSIC_ORB_HIDE_DELAY_MS = 200;

/** 文章页浮动音乐钮：配乐条滚出视口后显示，始终保留栈内占位 */
export function ArticleFloatMusicOrb() {
  const hasMusic = Boolean(useArticleMusic((state) => state.track));
  const isMusicBarInView = useArticleMusic((state) => state.isMusicBarInView);
  const [showOrb, setShowOrb] = useState(false);
  const showOrbRef = useRef(false);

  useEffect(() => {
    if (!hasMusic) {
      showOrbRef.current = false;
      setShowOrb(false);
      return;
    }

    if (!isMusicBarInView) {
      showOrbRef.current = true;
      setShowOrb(true);
      return;
    }

    const timer = window.setTimeout(() => {
      showOrbRef.current = false;
      setShowOrb(false);
    }, MUSIC_ORB_HIDE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hasMusic, isMusicBarInView]);

  if (!hasMusic) return null;

  return (
    <div
      className={cn("size-10 shrink-0", !showOrb && floatDockOrbHiddenClass)}
      aria-hidden={!showOrb}
    >
      <ArticleMusicControl variant="float" />
    </div>
  );
}
