"use client";

import { useArticleMusic } from "@/store/use-article-music";
import { ArticleMusicControl } from "./article-music-control";

/** 配乐条滚出视口后才在浮动 Dock 显示音乐钮 */
export function ArticleFloatMusicOrb() {
  const hasMusic = Boolean(useArticleMusic((state) => state.track));
  const isMusicBarInView = useArticleMusic((state) => state.isMusicBarInView);

  if (!hasMusic || isMusicBarInView) return null;
  return <ArticleMusicControl variant="float" />;
}
