import { useEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, Slider, cn } from "@repo/ui";
import { adminRowActionClassName } from "../../../components/AdminRowAction";
import { formatFileSize } from "../model";

interface MusicAudioPlayerProps {
  title: string;
  url?: string;
  variant?: "compact" | "full";
  fileName?: string;
  mime?: string;
  size?: number;
  fallbackDuration?: number;
}

function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function MusicAudioPlayer({
  title,
  url,
  variant = "compact",
  fileName,
  mime,
  size = 0,
  fallbackDuration = 0,
}: MusicAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const syncTime = () => setCurrentTime(audio.currentTime);
    const syncDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : fallbackDuration);
    };
    const stop = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("ended", stop);
    audio.addEventListener("error", stop);
    setCurrentTime(0);
    setDuration(fallbackDuration);
    setIsPlaying(false);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("error", stop);
    };
  }, [fallbackDuration, url]);

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!url || !audio || isLoading) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeek = (nextTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const audio = (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} src={url} preload="metadata" />
  );
  const playButton = (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(variant === "compact" ? adminRowActionClassName : "size-9 shrink-0 p-0")}
      aria-label={isPlaying ? `暂停 ${title}` : `播放 ${title}`}
      isDisabled={!url}
      isLoading={isLoading}
      onPress={() => void handleToggle()}
    >
      <SvgIcon name={isPlaying ? "pause" : "play"} size={variant === "compact" ? 13 : 16} />
      {variant === "compact" ? <span aria-hidden="true">试听</span> : null}
    </Button>
  );

  if (variant === "compact") {
    return (
      <>
        {audio}
        {playButton}
      </>
    );
  }

  const metadata = [mime || null, size > 0 ? formatFileSize(size) : null]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
  const sliderMax = Math.max(duration, 1);

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-3">
      {audio}
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <SvgIcon name="music" size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{fileName ?? "已上传音频"}</p>
          {metadata ? <p className="mt-0.5 text-xs text-muted-foreground">{metadata}</p> : null}
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {playButton}
        <Slider
          label={`${title} 播放进度`}
          value={Math.min(Math.max(currentTime, 0), sliderMax)}
          minValue={0}
          maxValue={sliderMax}
          step={1}
          isDisabled={!url || duration <= 0}
          onChange={handleSeek}
          className="flex-1"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
        </span>
      </div>
    </div>
  );
}
