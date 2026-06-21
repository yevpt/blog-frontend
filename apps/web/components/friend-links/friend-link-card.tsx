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
  "flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3.5";

export function FriendLinkCard({ link }: FriendLinkCardProps) {
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
          {disconnected && (
            <span className="flex-shrink-0 rounded border border-destructive/30 bg-destructive/10 px-1.5 py-px text-[10px] font-semibold text-destructive">
              失联
            </span>
          )}
        </div>
        {link.description && (
          <p className="truncate text-xs text-muted-foreground">{link.description}</p>
        )}
      </div>

      {!disconnected && (
        <SvgIcon
          name="arrow-up-right"
          size={14}
          className="flex-shrink-0 text-muted-foreground/40"
        />
      )}
    </>
  );

  if (disconnected) {
    return <div className={cn(baseCardClass, "cursor-not-allowed opacity-55")}>{inner}</div>;
  }

  return (
    <a
      href={link.site}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(baseCardClass, "transition-colors duration-150 hover:border-primary")}
    >
      {inner}
    </a>
  );
}
