"use client";

import type { ReactNode } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useArticleMusic } from "@/store/use-article-music";
import {
  floatDockIconSize,
  floatDockOrbClass,
  floatDockOrbMusicClass,
  floatDockOrbSize,
} from "@/components/float-dock";

type ArticleMusicControlVariant = "float" | "navbar";

interface ArticleMusicControlProps {
  variant: ArticleMusicControlVariant;
}

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number;
}

function MusicProgressRing({ size, strokeWidth, progress }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <svg
      data-testid="music-progress-ring"
      className="pointer-events-none absolute inset-0"
      width={size}
      height={size}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-border"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-primary"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function ControlIcon({
  playbackState,
  variant,
}: {
  playbackState: ReturnType<typeof useArticleMusic.getState>["playbackState"];
  variant: ArticleMusicControlVariant;
}) {
  const iconSize = variant === "float" ? floatDockIconSize : 18;

  if (playbackState === "playing") {
    return <SvgIcon name="pause" size={iconSize} className="text-current" aria-hidden />;
  }

  if (playbackState === "paused") {
    return <SvgIcon name="play" size={iconSize} className="text-current" aria-hidden />;
  }

  return <SvgIcon name="music" size={iconSize} className="text-current" aria-hidden />;
}

function MusicControlButton({
  children,
  className,
  ariaLabel,
  isDisabled,
  isLoading,
  onPress,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={ariaLabel}
      aria-busy={isLoading}
      isDisabled={isDisabled}
      onPress={onPress}
      className={className}
    >
      {children}
    </Button>
  );
}

/** 全局背景音乐控制钮：PC 浮动 Dock / 移动端 Nav */
export function ArticleMusicControl({ variant }: ArticleMusicControlProps) {
  const track = useArticleMusic((state) => state.track);
  const playbackState = useArticleMusic((state) => state.playbackState);
  const progress = useArticleMusic((state) => state.progress);
  const hasPlayedOnce = useArticleMusic((state) => state.hasPlayedOnce);
  const toggle = useArticleMusic((state) => state.toggle);

  if (!track) return null;

  const isPlaying = playbackState === "playing";
  const isLoading = playbackState === "loading";
  const ariaLabel = isPlaying
    ? `暂停 ${track.name}`
    : isLoading
      ? `加载 ${track.name}`
      : `播放 ${track.name}`;

  const size = variant === "float" ? floatDockOrbSize : 32;
  const strokeWidth = variant === "float" ? 2 : 1.5;

  const buttonClass =
    variant === "float"
      ? cn(floatDockOrbClass, floatDockOrbMusicClass)
      : cn(
          "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-0",
          "text-black/54 hover:bg-foreground/5 dark:text-(--fg3)",
          "disabled:cursor-not-allowed",
        );

  return (
    <MusicControlButton
      ariaLabel={ariaLabel}
      isDisabled={isLoading}
      isLoading={isLoading}
      onPress={() => void toggle()}
      className={buttonClass}
    >
      {hasPlayedOnce ? (
        <MusicProgressRing size={size} strokeWidth={strokeWidth} progress={progress} />
      ) : null}
      <span className="relative z-10 flex items-center justify-center">
        <ControlIcon playbackState={playbackState} variant={variant} />
      </span>
    </MusicControlButton>
  );
}
