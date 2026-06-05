"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { SvgIcon } from "@repo/icons";

interface MusicPlayerProps {
  url?: string;
  name?: string;
}

export function MusicPlayer({ url, name }: MusicPlayerProps) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 组件卸载时停止播放，避免内存泄漏
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  if (!url) return null;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress(audio.currentTime / audio.duration);
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Number(e.target.value);
    audio.currentTime = v * audio.duration;
    setProgress(v);
  };

  return (
    <div className="relative">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={url}
        loop
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
      {open && (
        <div className="absolute bottom-[calc(100%+8px)] right-0 w-56 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 truncate text-xs font-semibold text-foreground">
            {name ?? "背景音乐"}
          </p>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={progress}
            onChange={handleSeek}
            className="mb-2 w-full accent-primary"
          />
          <button
            onClick={togglePlay}
            className="flex w-full items-center justify-center gap-1 rounded-md bg-primary/10 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            {playing ? "暂停" : "播放"}
          </button>
        </div>
      )}
      <button
        aria-label={open ? "关闭音乐播放器" : "音乐播放器"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted"
      >
        <SvgIcon name="music" className="h-4 w-4 text-foreground" />
      </button>
    </div>
  );
}
