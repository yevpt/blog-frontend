import type { ReactNode } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useMusicPreview } from "../hooks/use-music-preview";

export interface ArticleMusicPreviewRowProps {
  trackId: number;
  title: string;
  artist: string;
  durationSeconds: number;
  url?: string;
  actions: ReactNode;
  className?: string;
}

export function ArticleMusicPreviewRow({
  trackId,
  title,
  artist,
  durationSeconds,
  url,
  actions,
  className,
}: ArticleMusicPreviewRowProps) {
  const {
    audioRef,
    state,
    progress,
    hasStarted,
    canPreview,
    durationLabel,
    progressLabel,
    handleTogglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleSeek,
  } = useMusicPreview({ trackId, url, durationSeconds });

  const showProgress = hasStarted || state === "playing" || state === "paused";
  const isPlaying = state === "playing";
  const playLabel =
    state === "playing" ? `暂停 ${title}` : state === "loading" ? `加载 ${title}` : `播放 ${title}`;

  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 rounded-xl border border-border bg-background p-3",
        className,
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <button
        type="button"
        className={cn(
          "relative grid size-9 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground",
          "transition-colors hover:bg-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          (state === "loading" || !canPreview) && "pointer-events-none text-muted-foreground",
        )}
        aria-pressed={isPlaying}
        aria-label={playLabel}
        aria-busy={state === "loading"}
        disabled={!canPreview}
        title={canPreview ? undefined : "暂无音频，无法试听"}
        onClick={() => void handleTogglePlay()}
      >
        {state === "loading" ? (
          <span
            className="size-3.5 animate-spin rounded-full border-[1.5px] border-border border-t-foreground"
            aria-hidden
          />
        ) : (
          <>
            <SvgIcon
              name="play"
              size={15}
              className={cn("transition-opacity duration-150", isPlaying && "opacity-0")}
            />
            <SvgIcon
              name="pause"
              size={15}
              className={cn(
                "absolute transition-opacity duration-150",
                isPlaying ? "opacity-100" : "opacity-0",
              )}
            />
          </>
        )}
      </button>

      <div className="flex h-10 min-w-0 flex-1 flex-col justify-center">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <div className="relative mt-1 h-4">
          <p
            className={cn(
              "absolute inset-0 flex items-center text-xs text-muted-foreground transition-opacity duration-150",
              showProgress && "pointer-events-none opacity-0",
            )}
          >
            {artist} · {durationLabel}
          </p>
          <div
            className={cn(
              "absolute inset-0 flex items-center gap-2.5 transition-opacity duration-150",
              showProgress ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <span className="shrink-0 text-[11px] tabular-nums tracking-tight text-muted-foreground">
              {progressLabel}
            </span>
            <div className="relative flex h-4 min-w-0 flex-1 items-center">
              <div className="h-0.5 w-full rounded-full bg-border">
                <div
                  className={cn(
                    "h-full rounded-full bg-foreground transition-none",
                    isPlaying ? "opacity-55" : "opacity-35",
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                aria-label="播放进度"
                aria-valuetext={progressLabel}
                className="absolute inset-y-[-6px] left-0 h-[calc(100%+12px)] w-full cursor-pointer opacity-0"
                onChange={(event) => handleSeek(Number(event.target.value) / 1000)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
    </div>
  );
}
