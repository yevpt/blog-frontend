import { SvgIcon } from "@repo/icons";
import { Badge, Button } from "@repo/ui";
import { riskLevelVariant } from "../../model";
import type { RuleRow } from "../model";
import { RuleToggleActiveButton } from "./RuleToggleActiveButton";

interface RuleMobileListProps {
  rows: RuleRow[];
  isLoading: boolean;
  selectedIds: Set<number>;
  togglingRuleId: number | null;
  isSubmitting: boolean;
  onToggleSelect: (id: number, checked: boolean) => void;
  onEdit: (row: RuleRow) => void;
  onConfirmToggleActive: (row: RuleRow) => Promise<void>;
}

export function RuleMobileList({
  rows,
  isLoading,
  selectedIds,
  togglingRuleId,
  isSubmitting,
  onToggleSelect,
  onEdit,
  onConfirmToggleActive,
}: RuleMobileListProps) {
  if (isLoading) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">加载规则…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <SvgIcon name="shield" size={28} />
        <p className="text-sm font-medium text-foreground">暂无规则</p>
        <p className="text-sm text-muted-foreground">调整筛选或新增规则。</p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2 p-3">
      {rows.map((row) => (
        <article key={row.id} className="rounded-md border border-border/70 bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">#{row.id}</span>
                <Badge variant={row.active ? "default" : "secondary"}>{row.activeLabel}</Badge>
                <Badge variant={riskLevelVariant(row.riskLevel)}>{row.riskLabel}</Badge>
              </div>
              {row.name ? <p className="mt-1 text-xs text-muted-foreground">{row.name}</p> : null}
              <p className="mt-2 break-all text-sm leading-6">{row.pattern}</p>
            </div>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                aria-label={`选择规则 ${row.id}`}
                checked={selectedIds.has(row.id)}
                onChange={(event) => onToggleSelect(row.id, event.target.checked)}
              />
              选择
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {row.categoryLabel} · {row.sourceLabel} · {row.ruleTypeLabel} · {row.effectLabel} ·
            优先级 {row.priority}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onPress={() => onEdit(row)}>
              修改
            </Button>
            <RuleToggleActiveButton
              row={row}
              isSubmitting={isSubmitting && togglingRuleId === row.id}
              onConfirm={onConfirmToggleActive}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
