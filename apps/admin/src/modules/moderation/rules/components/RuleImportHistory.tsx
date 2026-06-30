import type { AdminModerationImportResp } from "@repo/api";
import { Badge, Button } from "@repo/ui";
import { formatDateTime } from "../model";

interface RuleImportHistoryProps {
  items: AdminModerationImportResp[];
  onDownloadErrors: (importId: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "排队中",
  validating: "校验中",
  valid: "校验通过",
  invalid: "校验失败",
  canceled: "已取消",
};

export function RuleImportHistory({ items, onDownloadErrors }: RuleImportHistoryProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无导入历史</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((item) => (
        <li key={item.id} className="space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">#{item.id}</span>
            <span>{item.file_name}</span>
            <Badge variant="secondary">
              {STATUS_LABELS[item.validation_status] ?? item.validation_status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            总行 {item.total_rows} · 有效 {item.valid_rows} · 重复 {item.duplicate_rows} · 错误{" "}
            {item.error_rows}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(item.updated_at)}</p>
          {item.error_rows > 0 ? (
            <Button size="sm" variant="outline" onPress={() => onDownloadErrors(item.id)}>
              下载错误报告
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
