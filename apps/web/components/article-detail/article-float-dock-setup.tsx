"use client";

import { useEffect, useMemo } from "react";
import { useFloatDockConfig } from "@/components/float-dock";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ARTICLE_FLOAT_DOCK_LAYOUT } from "@/lib/float-dock-layouts";
import { useActiveArticle } from "@/store/use-active-article";
import { ArticleFloatLikeOrb } from "./article-float-like-orb";
import { ArticleFloatMusicOrb } from "./article-float-music-orb";

const MD_MEDIA_QUERY = "(min-width: 768px)";

interface ArticleFloatDockSetupProps {
  articleId: number;
  hasToc?: boolean;
}

/** 文章详情页：注册浮动 Dock 定位与点赞/音乐扩展 orb */
export function ArticleFloatDockSetup({ articleId, hasToc = false }: ArticleFloatDockSetupProps) {
  const patchViewCount = useActiveArticle((state) => state.patchViewCount);
  const isMdViewport = useMediaQuery(MD_MEDIA_QUERY);

  const items = useMemo(
    () => [
      { id: "music", order: 10, render: () => <ArticleFloatMusicOrb /> },
      // 移动端导航栏已有点赞入口，右下角浮动钮仅桌面端展示
      ...(isMdViewport ? [{ id: "like", order: 20, render: () => <ArticleFloatLikeOrb /> }] : []),
    ],
    [isMdViewport],
  );

  useFloatDockConfig({
    position: {
      variant: "page-column",
      layout: ARTICLE_FLOAT_DOCK_LAYOUT,
      hasSidebar: hasToc,
    },
    items,
  });

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

  return null;
}
