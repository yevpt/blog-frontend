import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

interface MusicArtworkProps {
  src?: string;
  alt: string;
  className?: string;
}

export function MusicArtwork({ src, alt, className }: MusicArtworkProps) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <SvgIcon name="music" size={18} className="text-muted-foreground" />
      )}
    </div>
  );
}
