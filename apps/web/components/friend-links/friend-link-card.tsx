import { memo } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { LoadingImage } from "@/components/common/loading-image";

interface FriendLinkCardProps {
  link: FriendLinkItemResp;
}

function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm font-bold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const baseCardClass =
  "flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3.5 transition-colors duration-150";

export const FriendLinkCard = memo(function FriendLinkCard({ link }: FriendLinkCardProps) {
  // status=0（隐藏）不应出现在公开列表，防御性处理
  if (link.status === 0) return null;

  const disconnected = link.status === 2;

  const inner = (
    <>
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-[10px]">
        {link.avatar_url ? (
          <LoadingImage
            src={link.avatar_url}
            alt={link.name}
            fill
            unoptimized
            className="object-cover"
            sizes="44px"
            skeletonClassName="rounded-[10px]"
            fallbackClassName="rounded-[10px]"
          />
        ) : (
          <AvatarFallback name={link.name} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              disconnected ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {link.name}
          </span>
        </div>
        {link.description && (
          <p className="truncate text-xs text-muted-foreground">{link.description}</p>
        )}
      </div>

      <SvgIcon
        name="arrow-up-right"
        size={14}
        className={cn(
          "flex-shrink-0",
          disconnected ? "text-muted-foreground/25" : "text-muted-foreground/40",
        )}
      />
    </>
  );

  return (
    <a
      href={link.site}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        baseCardClass,
        disconnected
          ? "border-border/70 bg-secondary/60 hover:border-muted-foreground/30 hover:bg-secondary/80"
          : "hover:border-primary",
      )}
    >
      {inner}
    </a>
  );
});
