import { Badge, Checkbox, DataTable, type DataTableColumn } from "@repo/ui";
import { useMemo } from "react";
import { AdminRowAction, AdminRowActions } from "../../../../components/AdminRowAction";
import { adminFlushDataTableClassNames } from "../../../../lib/data-table-flush";
import { riskLevelVariant } from "../../model";
import type { RuleRow } from "../model";
import { RuleToggleActiveButton } from "./RuleToggleActiveButton";

interface RuleTableProps {
  rows: RuleRow[];
  isLoading: boolean;
  selectedIds: Set<number>;
  togglingRuleId: number | null;
  isSubmitting: boolean;
  onToggleSelect: (id: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (row: RuleRow) => void;
  onConfirmToggleActive: (row: RuleRow) => Promise<void>;
}

export function RuleTable({
  rows,
  isLoading,
  selectedIds,
  togglingRuleId,
  isSubmitting,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onConfirmToggleActive,
}: RuleTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  const columns = useMemo<DataTableColumn<RuleRow>[]>(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            slot="selection"
            aria-label="全选当前批"
            isSelected={allSelected}
            onChange={onToggleSelectAll}
          />
        ),
        minWidth: 44,
        cell: (row) => (
          <Checkbox
            slot="selection"
            aria-label={`选择规则 ${row.id}`}
            isSelected={selectedIds.has(row.id)}
            onChange={(checked) => onToggleSelect(row.id, checked)}
          />
        ),
      },
      {
        id: "pattern",
        header: "ID / 模式",
        minWidth: 180,
        isRowHeader: true,
        className: "min-w-0 whitespace-normal",
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-medium">#{row.id}</p>
            {row.name ? <p className="text-xs text-muted-foreground">{row.name}</p> : null}
            <p className="truncate text-sm">{row.pattern}</p>
          </div>
        ),
      },
      {
        id: "category",
        header: "分类 / 来源",
        minWidth: 120,
        cell: (row) => (
          <div>
            <p>{row.categoryLabel}</p>
            <p className="text-xs text-muted-foreground">{row.sourceLabel}</p>
          </div>
        ),
      },
      {
        id: "type",
        header: "类型 / 效果",
        minWidth: 100,
        cell: (row) => (
          <div>
            <p>{row.ruleTypeLabel}</p>
            <p className="text-xs text-muted-foreground">{row.effectLabel}</p>
          </div>
        ),
      },
      {
        id: "risk",
        header: "风险",
        minWidth: 80,
        cell: (row) => <Badge variant={riskLevelVariant(row.riskLevel)}>{row.riskLabel}</Badge>,
      },
      {
        id: "priority",
        header: "优先级",
        minWidth: 72,
        className: "tabular-nums",
        cell: (row) => row.priority,
      },
      {
        id: "state",
        header: "状态",
        minWidth: 72,
        cell: (row) => (
          <Badge variant={row.active ? "default" : "secondary"}>{row.activeLabel}</Badge>
        ),
      },
      {
        id: "actions",
        header: "操作",
        minWidth: 140,
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => (
          <AdminRowActions>
            <AdminRowAction type="button" onPress={() => onEdit(row)}>
              修改
            </AdminRowAction>
            <RuleToggleActiveButton
              row={row}
              isSubmitting={isSubmitting && togglingRuleId === row.id}
              onConfirm={onConfirmToggleActive}
            />
          </AdminRowActions>
        ),
      },
    ],
    [
      allSelected,
      isSubmitting,
      onConfirmToggleActive,
      onEdit,
      onToggleSelect,
      onToggleSelectAll,
      selectedIds,
      togglingRuleId,
    ],
  );

  return (
    <DataTable
      aria-label="审核规则列表"
      items={rows}
      columns={columns}
      getRowId={(row) => String(row.id)}
      isLoading={isLoading}
      showTotal={false}
      showToolbar={false}
      embedded
      maxHeightClassName={false}
      classNames={adminFlushDataTableClassNames}
      emptyState={{
        icon: "shield",
        title: "暂无规则",
        description: "调整筛选或新增规则。",
      }}
    />
  );
}
