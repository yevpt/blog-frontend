import { Pagination } from "@repo/ui";
import { getActionLabel, useUserOperationLogs } from "../hooks/use-user-operation-logs";

export function UserOperationLogList({ userId }: { userId: number }) {
  const { items, total, page, setPage, isLoading, error } = useUserOperationLogs(userId);
  const totalPages = Math.max(1, Math.ceil(total / 10));

  if (isLoading) return <p className="text-sm text-muted-foreground">加载中…</p>;
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无操作记录</p>;
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border border-border/70 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{getActionLabel(item.action)}</span>
            <span className="ml-2 text-muted-foreground">
              操作人 #{item.operator_id} · {formatDateTime(item.created_at)}
            </span>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN");
}
