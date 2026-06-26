export interface BarListItem {
  label: string;
  value: number;
  /** 右侧次要文字，如占比或 UV */
  hint?: string;
}

interface BarListProps {
  items: BarListItem[];
  /** 空态文案 */
  emptyText?: string;
}

/** 横向条形占比列表：精致克制风格，最大值占满，其余按比例。 */
export function BarList({ items, emptyText = "暂无数据" }: BarListProps) {
  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted">{emptyText}</div>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="grid gap-3">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="truncate text-text-primary">{item.label}</span>
            <span className="shrink-0 pl-3 text-text-muted">
              {item.value.toLocaleString()}
              {item.hint ? <span className="ml-2">{item.hint}</span> : null}
            </span>
          </div>
          <div className="h-1 rounded-full bg-surface-0">
            <div
              className="h-1 rounded-full bg-primary"
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
