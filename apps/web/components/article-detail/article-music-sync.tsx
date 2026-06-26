"use client";

import { useLayoutEffect } from "react";
import { useArticleMusic } from "@/store/use-article-music";

interface ArticleMusicSyncProps {
  musicUrl?: string;
  musicName?: string;
  musicArtist?: string;
  musicCoverUrl?: string;
  musicDurationSeconds?: number;
}

/** 在首屏绘制前写入背景音乐信息，与 ArticleNavbarSync 同理 */
export function ArticleMusicSync({
  musicUrl,
  musicName,
  musicArtist,
  musicCoverUrl,
  musicDurationSeconds,
}: ArticleMusicSyncProps) {
  const init = useArticleMusic((state) => state.init);
  const clear = useArticleMusic((state) => state.clear);

  useLayoutEffect(() => {
    if (musicUrl && musicName) {
      init({
        url: musicUrl,
        name: musicName,
        artist: musicArtist,
        coverUrl: musicCoverUrl,
        durationSeconds: musicDurationSeconds,
      });
    } else {
      clear();
    }

    return () => {
      clear();
    };
  }, [musicUrl, musicName, musicArtist, musicCoverUrl, musicDurationSeconds, init, clear]);

  return null;
}
