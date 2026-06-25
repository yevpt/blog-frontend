import { useEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";

interface MusicPreviewButtonProps {
  title: string;
  url?: string;
}

export function MusicPreviewButton({ title, url }: MusicPreviewButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [url]);

  const handleToggle = async () => {
    if (!url || !audioRef.current || isLoading) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} preload="metadata" />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        aria-label={isPlaying ? `暂停 ${title}` : `播放 ${title}`}
        isDisabled={!url}
        isLoading={isLoading}
        onPress={() => void handleToggle()}
      >
        <SvgIcon
          name={isPlaying ? "pause" : "play"}
          size={13}
          className={cn(isPlaying && "text-primary")}
        />
        <span aria-hidden="true">试听</span>
        <span className="sr-only">{isPlaying ? `暂停 ${title}` : `播放 ${title}`}</span>
      </Button>
    </>
  );
}
