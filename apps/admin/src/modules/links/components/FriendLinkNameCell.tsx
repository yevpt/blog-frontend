import type { FriendLinkRow } from "../model";

interface FriendLinkNameCellProps {
  link: FriendLinkRow;
}

function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="flex size-full items-center justify-center bg-muted text-xs font-semibold text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function FriendLinkNameCell({ link }: FriendLinkNameCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-[10px] border border-border/70">
        {link.avatarUrl ? (
          <img src={link.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <AvatarFallback name={link.name} />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{link.name}</p>
        {link.description ? (
          <p className="truncate text-xs text-muted-foreground">{link.description}</p>
        ) : null}
      </div>
    </div>
  );
}
