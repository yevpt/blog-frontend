import { Badge, Button, type DataTableEmptyState } from "@repo/ui";
import type { UserRow } from "../model";

interface UserMobileListProps {
  items: UserRow[];
  isLoading: boolean;
  emptyState: DataTableEmptyState;
  togglingUserId: string | null;
  onToggleVip: (user: UserRow) => void;
}

export function UserMobileList({
  items,
  isLoading,
  emptyState,
  togglingUserId,
  onToggleVip,
}: UserMobileListProps) {
  if (isLoading) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">加载中…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
        {emptyState.description ? (
          <p className="max-w-72 text-sm leading-6 text-muted-foreground">
            {emptyState.description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2 p-3">
      {items.map((user) => (
        <article
          key={user.id}
          className="min-w-0 rounded-md border border-border/70 bg-background px-3 py-3"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                #{user.id}
                {user.mark ? ` · ${user.mark}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant={user.isVip ? "outline" : "default"}
              className="h-7 shrink-0 px-2 text-xs"
              isLoading={togglingUserId === user.id}
              onPress={() => onToggleVip(user)}
            >
              {user.isVip ? "取消 VIP" : "授予 VIP"}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {user.isAdmin ? <Badge variant="brand">管理员</Badge> : null}
            {user.isVip ? <Badge variant="success">VIP</Badge> : null}
            {!user.isAdmin && !user.isVip ? <Badge variant="secondary">普通用户</Badge> : null}
            <Badge variant={user.isOnline ? "success" : "secondary"}>
              {user.isOnline ? "在线" : "离线"}
            </Badge>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">最近活跃：{user.lastActiveAt}</p>
        </article>
      ))}
    </div>
  );
}
