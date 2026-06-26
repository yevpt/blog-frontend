"use client";

import { useEffect, useRef } from "react";
import { useArticleMusic } from "@/store/use-article-music";

/** 文章页单例 audio，与 useArticleMusic store 绑定 */
export function ArticleMusicHost() {
  const track = useArticleMusic((state) => state.track);
  const bindAudio = useArticleMusic((state) => state.bindAudio);
  const setProgress = useArticleMusic((state) => state.setProgress);
  const setPlaybackState = useArticleMusic((state) => state.setPlaybackState);
  const patchTrack = useArticleMusic((state) => state.patchTrack);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bindAudio(audioRef.current);
    return () => bindAudio(null);
  }, [bindAudio, track?.url]);

  if (!track?.url) return null;

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio
      ref={audioRef}
      src={track.url}
      loop
      preload="metadata"
      className="hidden"
      onLoadedMetadata={() => {
        const audio = audioRef.current;
        if (!audio?.duration || !Number.isFinite(audio.duration)) return;
        patchTrack({ durationSeconds: Math.floor(audio.duration) });
      }}
      onTimeUpdate={() => {
        const audio = audioRef.current;
        if (!audio?.duration) return;
        setProgress(audio.currentTime / audio.duration);
      }}
      onEnded={() => setPlaybackState("paused")}
      onError={() => setPlaybackState("error")}
    />
  );
}
