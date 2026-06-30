import { useCallback, useState } from "react";
import { Button } from "@repo/ui";
import { AdminListCard } from "../../../../components/AdminListCard";
import { AdminListSummary } from "../../../../components/AdminListSummary";
import { useIsMdScreen } from "../../../tags/hooks/use-is-md-screen";
import type { UseRuleListResult } from "../hooks/use-rule-list";
import type { UseRuleStatusResult } from "../hooks/use-rule-status";
import type { RuleRow } from "../model";
import { RuleBatchBar } from "./RuleBatchBar";
import { RuleMobileList } from "./RuleMobileList";
import { RuleStatusSummary } from "./RuleStatusSummary";
import { RuleTable } from "./RuleTable";
import { RuleToolbar } from "./RuleToolbar";

export interface RulePanelActions {
  onAdd: () => void;
  onTest: () => void;
  onImport: () => void;
  onTemplate: (format: "csv" | "txt") => void;
  onExport: () => void;
  onEdit: (row: RuleRow) => void;
  onConfirmToggleActive: (row: RuleRow) => Promise<void>;
  exportDisabled?: boolean;
}

interface RuleBatchBarState {
  selectedCount: number;
  isBusy: boolean;
  candidateBlocking: boolean;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  onClear: () => void;
}

interface RulePanelProps {
  list: UseRuleListResult;
  statusState: UseRuleStatusResult;
  actions: RulePanelActions;
  selectedIds: Set<number>;
  togglingRuleId: number | null;
  isSubmitting: boolean;
  onSelectedIdsChange: (ids: Set<number>) => void;
  batchBar: RuleBatchBarState;
}

export function RulePanel({
  list,
  statusState,
  actions,
  selectedIds,
  togglingRuleId,
  isSubmitting,
  onSelectedIdsChange,
  batchBar,
}: RulePanelProps) {
  const desktop = useIsMdScreen();

  const handleToggleSelect = useCallback(
    (id: number, checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) next.add(id);
      else next.delete(id);
      onSelectedIdsChange(next);
    },
    [onSelectedIdsChange, selectedIds],
  );

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        onSelectedIdsChange(new Set());
        return;
      }
      onSelectedIdsChange(new Set(list.rows.map((row) => row.id)));
    },
    [list.rows, onSelectedIdsChange],
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label="规则管理">
      <RuleStatusSummary status={statusState.status} isLoading={statusState.isLoading} />

      {statusState.error ? (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {statusState.error.message}
        </p>
      ) : null}
      {list.error ? (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {list.error.message}
        </p>
      ) : null}

      <AdminListCard className="min-h-0 flex-1 md:min-h-[360px]">
        <RuleToolbar
          filters={list.filters}
          metadata={statusState.metadata}
          hasActiveFilters={list.hasActiveFilters}
          searchError={list.searchError}
          onFilterChange={list.setFilter}
          onResetFilters={list.resetFilters}
          onAdd={actions.onAdd}
          onTest={actions.onTest}
          onImport={actions.onImport}
          onTemplate={actions.onTemplate}
          onExport={actions.onExport}
          exportDisabled={actions.exportDisabled}
        />

        <RuleBatchBar {...batchBar} />

        <div className="min-h-0 flex-1 overflow-hidden">
          {desktop ? (
            <RuleTable
              rows={list.rows}
              isLoading={list.isLoading}
              selectedIds={selectedIds}
              togglingRuleId={togglingRuleId}
              isSubmitting={isSubmitting}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onEdit={actions.onEdit}
              onConfirmToggleActive={actions.onConfirmToggleActive}
            />
          ) : (
            <RuleMobileList
              rows={list.rows}
              isLoading={list.isLoading}
              selectedIds={selectedIds}
              togglingRuleId={togglingRuleId}
              isSubmitting={isSubmitting}
              onToggleSelect={handleToggleSelect}
              onEdit={actions.onEdit}
              onConfirmToggleActive={actions.onConfirmToggleActive}
            />
          )}
        </div>

        {!list.isLoading ? (
          <div className="shrink-0 px-4 py-3">
            <AdminListSummary
              visibleCount={list.rows.length}
              secondary={
                list.canGoNext || list.canGoPrevious ? "游标分页，仅加载当前批" : undefined
              }
              className="px-0 pt-0"
            />
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onPress={list.previousPage}
                isDisabled={!list.canGoPrevious}
              >
                上一批
              </Button>
              <Button type="button" size="sm" onPress={list.nextPage} isDisabled={!list.canGoNext}>
                下一批
              </Button>
            </div>
          </div>
        ) : null}
      </AdminListCard>
    </section>
  );
}

/** 供页面持有选中状态 */
export function useRuleSelection() {
  return useState<Set<number>>(() => new Set());
}
