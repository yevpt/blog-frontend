"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { ArticleMusicSyncInput } from "@/lib/article-music";
import { useArticleMusic, type ArticleMusicTrack } from "@/store/use-article-music";
import { MusicSeek } from "./article-music-seek";

/** 频谱条配置：跳动时长 / 起始延迟（错峰）/ 静止时的高度比例。 */
const VISUALIZER_BARS = [
  { duration: 900, delay: 0, idle: 0.4 },
  { duration: 1300, delay: 120, idle: 0.85 },
  { duration: 1000, delay: 60, idle: 0.55 },
  { duration: 1500, delay: 200, idle: 0.7 },
] as const;

const articleMusicHeightClass = "h-16 max-sm:h-14";

const articleMusicSpacingClass = "mt-8 mb-2 max-sm:mt-7 max-sm:mb-1.5";

const articleMusicShellClass = cn(
  "group/article-music relative flex items-center gap-3 px-4",
  articleMusicHeightClass,
  articleMusicSpacingClass,
  "rounded-2xl border border-foreground/[0.07] bg-foreground/[0.02] text-foreground/80",
  "transition-colors hover:bg-foreground/[0.035]",
  "max-sm:gap-2 max-sm:rounded-xl max-sm:px-3",
  "dark:border-border/70 dark:bg-muted/20 dark:text-foreground dark:hover:bg-muted/30",
);

function formatMusicTime(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function MusicVisualizer({ active, className }: { active: boolean; className?: string }) {
  return (
    <div
      className={cn("hidden h-[18px] shrink-0 items-end gap-[3px] sm:flex", className)}
      aria-hidden
    >
      {VISUALIZER_BARS.map((bar, index) => (
        <span
          key={index}
          className={cn(
            "h-full w-[3px] origin-bottom rounded-full",
            active
              ? "bg-foreground/55 dark:bg-foreground/70"
              : "bg-foreground/30 dark:bg-foreground/40",
          )}
          style={
            active
              ? { animation: `equalize ${bar.duration}ms ease-in-out ${bar.delay}ms infinite` }
              : { transform: `scaleY(${bar.idle})` }
          }
        />
      ))}
    </div>
  );
}

function MusicPlayButton({
  isPlaying,
  isLoading,
  playLabel,
  onPress,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  playLabel: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full max-sm:size-8",
        "border border-foreground/10 bg-card text-foreground/75 shadow-sm",
        "transition group-hover/article-music:border-foreground/[0.18] group-hover/article-music:text-foreground/90",
        "hover:scale-[1.05] active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-60",
        "dark:border-border dark:bg-card",
      )}
      aria-pressed={isPlaying}
      aria-label={playLabel}
      aria-busy={isLoading}
      disabled={isLoading}
      onClick={onPress}
    >
      {isLoading ? (
        <span
          className="size-3.5 animate-spin rounded-full border border-foreground/20 border-t-foreground/70"
          aria-hidden
        />
      ) : (
        <SvgIcon
          name={isPlaying ? "pause" : "play"}
          size={15}
          className={cn("text-current", !isPlaying && "translate-x-px")}
          aria-hidden
        />
      )}
    </button>
  );
}

/** 歌名完整显示时才展示歌手名；歌名出现省略号则隐藏歌手 */
function isTextTruncated(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth;
}

function MusicTrackText({ name, artist }: { name: string; artist?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const songNameRef = useRef<HTMLSpanElement>(null);
  const [showArtist, setShowArtist] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const songEl = songNameRef.current;

    const evaluate = () => {
      if (!artist || !songEl) {
        setShowArtist(false);
        return;
      }

      // 先仅渲染歌名：歌名自身已被截断则不再展示歌手
      flushSync(() => setShowArtist(false));
      if (isTextTruncated(songEl)) {
        setShowArtist(false);
        return;
      }

      // 歌名完整时尝试加入歌手，若导致歌名截断则仍隐藏歌手
      flushSync(() => setShowArtist(true));
      setShowArtist(!isTextTruncated(songEl));
    };

    evaluate();

    if (!row) return;
    const ro = new ResizeObserver(evaluate);
    ro.observe(row);
    return () => ro.disconnect();
  }, [name, artist]);

  return (
    <div
      ref={rowRef}
      data-testid="article-music-track-text"
      className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm leading-none max-sm:gap-1.5 max-sm:text-[13px]"
    >
      <span className="shrink-0 text-foreground/45 dark:text-muted-foreground">随文配乐</span>
      <span className="hidden h-3 w-px shrink-0 bg-foreground/15 sm:inline-block" aria-hidden />
      <span className="shrink-0 text-foreground/30 sm:hidden" aria-hidden>
        ·
      </span>
      <div
        data-testid="article-music-track-title"
        className="flex min-w-0 flex-1 items-center overflow-hidden"
      >
        <span
          ref={songNameRef}
          data-testid="article-music-track-name"
          className="min-w-0 truncate text-foreground/80 dark:text-foreground/90"
        >
          {name}
        </span>
        {artist && showArtist ? (
          <span
            data-testid="article-music-track-artist"
            className="shrink-0 text-foreground/80 dark:text-foreground/90"
          >
            · {artist}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function previewToTrack(preview: ArticleMusicSyncInput): ArticleMusicTrack {
  return {
    url: preview.musicUrl,
    name: preview.musicName,
    artist: preview.musicArtist,
    coverUrl: preview.musicCoverUrl,
    durationSeconds: preview.musicDurationSeconds,
  };
}

interface ArticleMusicBarProps {
  /** 服务端已解析的配乐信息，store 未 init 时直接用于首屏渲染 */
  preview?: ArticleMusicSyncInput;
}

/** 正文前随文配乐条：上层内容行 + 贴底可拖拽进度条（对齐设计稿大图形态） */
export function ArticleMusicBar({ preview }: ArticleMusicBarProps = {}) {
  const track = useArticleMusic((state) => state.track);
  const playbackState = useArticleMusic((state) => state.playbackState);
  const progress = useArticleMusic((state) => state.progress);
  const toggle = useArticleMusic((state) => state.toggle);
  const seek = useArticleMusic((state) => state.seek);
  const retry = useArticleMusic((state) => state.retry);

  const displayTrack = track ?? (preview ? previewToTrack(preview) : null);
  if (!displayTrack) return null;

  const isPlaying = playbackState === "playing";
  const isLoading = playbackState === "loading";
  const isError = track !== null && playbackState === "error";
  const playLabel = isPlaying
    ? `暂停 ${displayTrack.name}`
    : isLoading
      ? `加载 ${displayTrack.name}`
      : `播放 ${displayTrack.name}`;

  const hasDuration =
    displayTrack.durationSeconds !== undefined && displayTrack.durationSeconds > 0;
  const currentSeconds = hasDuration ? progress * displayTrack.durationSeconds! : undefined;
  const currentTime = formatMusicTime(currentSeconds);
  const totalTime = formatMusicTime(displayTrack.durationSeconds);

  if (isError) {
    return (
      <section
        data-testid="article-music-bar"
        aria-label="文章配乐"
        className={cn(
          "group/article-music relative flex items-center gap-3 px-4",
          articleMusicHeightClass,
          articleMusicSpacingClass,
          "rounded-2xl border border-foreground/[0.07] bg-foreground/[0.02] text-foreground/45",
          "max-sm:gap-2 max-sm:rounded-xl max-sm:px-3",
          "dark:border-border/70 dark:bg-muted/20",
        )}
      >
        <span
          className="size-10 shrink-0 rounded-full border border-foreground/10 bg-foreground/[0.05] max-sm:size-8"
          aria-hidden
        />
        <p className="min-w-0 flex-1 truncate text-sm max-sm:text-[13px]">随文配乐暂时不可用</p>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-foreground/[0.05] hover:text-foreground/70"
          aria-label="重试播放配乐"
          onClick={() => void retry()}
        >
          <SvgIcon name="rotate-cw" size={15} aria-hidden />
        </button>
      </section>
    );
  }

  return (
    <section
      data-testid="article-music-bar"
      aria-label="文章配乐"
      className={articleMusicShellClass}
    >
      <MusicPlayButton
        isPlaying={isPlaying}
        isLoading={isLoading}
        playLabel={playLabel}
        onPress={() => void toggle()}
      />

      {/* 文字行 + 进度条作为一组，在卡片内垂直居中；进度条左右对齐标签与时长 */}
      <div
        data-testid="article-music-content"
        className="ml-2 flex min-w-0 flex-1 translate-y-0.5 flex-col justify-center gap-2.5 py-1 max-sm:ml-0.5 max-sm:gap-2 max-sm:py-0.5"
      >
        <div className="flex min-w-0 translate-y-0.5 items-center gap-3 max-sm:gap-2">
          <MusicTrackText name={displayTrack.name} artist={displayTrack.artist} />

          <time
            className="shrink-0 tabular-nums text-xs text-foreground/45 max-sm:text-[11px] dark:text-muted-foreground"
            dateTime={`PT${Math.floor(currentSeconds ?? 0)}S`}
          >
            <span className="sm:hidden">{currentTime}</span>
            <span className="hidden sm:inline">
              {currentTime} / {totalTime}
            </span>
          </time>
        </div>

        <MusicSeek
          className="mt-0.5 h-2.5"
          progress={progress}
          valueText={`${currentTime} / ${totalTime}`}
          disabled={!hasDuration}
          onSeek={seek}
        />
      </div>

      <MusicVisualizer active={isPlaying} className="ml-3" />
    </section>
  );
}
