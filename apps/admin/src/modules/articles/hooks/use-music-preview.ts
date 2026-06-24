import { useCallback, useEffect, useRef, useState } from "react";
import { formatMusicDuration } from "../article-editor-utils";

export type MusicPreviewState = "idle" | "loading" | "playing" | "paused";

interface UseMusicPreviewOptions {
  trackId: number;
  url?: string;
  durationSeconds: number;
}

function formatProgressTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function useMusicPreview({ trackId, url, durationSeconds }: UseMusicPreviewOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<MusicPreviewState>("idle");
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [resolvedDuration, setResolvedDuration] = useState(durationSeconds);

  const resetPreview = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setState("idle");
    setProgress(0);
    setHasStarted(false);
    setResolvedDuration(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    resetPreview();
  }, [trackId, url, resetPreview]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  useEffect(() => {
    setResolvedDuration(durationSeconds);
  }, [durationSeconds]);

  const durationLabel = formatMusicDuration(resolvedDuration);
  const currentSeconds = progress * resolvedDuration;
  const progressLabel = `${formatProgressTime(currentSeconds)} / ${durationLabel}`;
  const canPreview = Boolean(url);

  const handleTogglePlay = useCallback(async () => {
    if (!url || state === "loading") return;

    const audio = audioRef.current;
    if (!audio) return;

    if (state === "playing") {
      audio.pause();
      setState("paused");
      return;
    }

    setState("loading");
    try {
      await audio.play();
      setHasStarted(true);
      setState("playing");
    } catch {
      setState(hasStarted ? "paused" : "idle");
    }
  }, [hasStarted, state, url]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress(audio.currentTime / audio.duration);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setResolvedDuration(Math.floor(audio.duration));
  }, []);

  const handleEnded = useCallback(() => {
    setState("paused");
    setProgress(1);
  }, []);

  const handleSeek = useCallback((nextProgress: number) => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    const ratio = Math.min(1, Math.max(0, nextProgress));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
    setHasStarted(true);
  }, []);

  return {
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
  };
}
