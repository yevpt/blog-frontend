import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { downloadBlob, resolveDownloadFilename } from "../../../lib/download";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import { useRuleList } from "./hooks/use-rule-list";
import { useRuleMutations } from "./hooks/use-rule-mutations";
import { useRuleStatus } from "./hooks/use-rule-status";
import { RuleFormDialog } from "./components/RuleFormDialog";
import { RuleImportDialog } from "./components/RuleImportDialog";
import { RulePanel, useRuleSelection } from "./components/RulePanel";
import { RuleTestDialog } from "./components/RuleTestDialog";
import type { RuleFormValues, RuleRow } from "./model";
import { toListReq } from "./model";

interface RulesTabProps {
  enabled: boolean;
}

export function RulesTab({ enabled }: RulesTabProps) {
  const list = useRuleList(enabled);
  const statusState = useRuleStatus(enabled);
  const [selectedIds, setSelectedIds] = useRuleSelection();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<RuleRow | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);

  const rulesetId = statusState.status?.current_ruleset_id ?? 0;

  const refreshAll = useCallback(() => {
    list.reload();
    statusState.reload();
  }, [list, statusState]);

  const mutations = useRuleMutations({ rulesetId, onCompleted: refreshAll });

  const candidateBlocking = useMemo(() => {
    const status = statusState.status?.candidate?.status;
    return status === "building" || status === "publishing" || status === "ready";
  }, [statusState.status?.candidate?.status]);

  const handleDownload = useCallback(
    async (action: () => Promise<{ blob: Blob; filename?: string }>, fallbackName: string) => {
      try {
        const { blob, filename } = await action();
        downloadBlob(blob, resolveDownloadFilename(filename, fallbackName));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : err instanceof Error ? err.message : "下载失败";
        addToast(message, "error");
      }
    },
    [],
  );

  const openCreate = useCallback(() => {
    mutations.clearErrors();
    setFormMode("create");
    setEditingRow(null);
    setFormOpen(true);
  }, [mutations]);

  const openEdit = useCallback(
    (row: RuleRow) => {
      mutations.clearErrors();
      setFormMode("edit");
      setEditingRow(row);
      setFormOpen(true);
    },
    [mutations],
  );

  const handleFormSubmit = useCallback(
    async (values: RuleFormValues) => {
      if (formMode === "create") return mutations.create(values);
      if (!editingRow) return false;
      return mutations.replace(editingRow.id, values);
    },
    [editingRow, formMode, mutations],
  );

  const handleToggleActive = useCallback(
    async (row: RuleRow) => {
      setTogglingRuleId(row.id);
      try {
        await mutations.batchStatus([row.id], !row.active);
      } finally {
        setTogglingRuleId(null);
      }
    },
    [mutations],
  );

  const handleBatchEnable = useCallback(async () => {
    const ok = await mutations.batchStatus([...selectedIds], true);
    if (ok) setSelectedIds(new Set());
  }, [mutations, selectedIds, setSelectedIds]);

  const handleBatchDisable = useCallback(async () => {
    const ok = await mutations.batchStatus([...selectedIds], false);
    if (ok) setSelectedIds(new Set());
  }, [mutations, selectedIds, setSelectedIds]);

  if (!enabled) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RulePanel
        list={list}
        statusState={statusState}
        selectedIds={selectedIds}
        togglingRuleId={togglingRuleId}
        isSubmitting={mutations.isSubmitting}
        onSelectedIdsChange={setSelectedIds}
        batchBar={{
          selectedCount: selectedIds.size,
          isBusy: mutations.isSubmitting,
          candidateBlocking,
          onEnable: handleBatchEnable,
          onDisable: handleBatchDisable,
          onClear: () => setSelectedIds(new Set()),
        }}
        actions={{
          onAdd: openCreate,
          onTest: () => setTestOpen(true),
          onImport: () => setImportOpen(true),
          onTemplate: (format) =>
            void handleDownload(
              () => apiClient.moderation.ruleImports.template(format),
              `moderation-rules-template.${format}`,
            ),
          onExport: () =>
            void handleDownload(
              () => apiClient.moderation.rules.exportRules(toListReq(list.filters)),
              "moderation-rules-export.csv",
            ),
          onEdit: openEdit,
          onConfirmToggleActive: handleToggleActive,
          exportDisabled: !statusState.status?.rule_count,
        }}
      />
      <RuleFormDialog
        mode={formMode}
        open={formOpen}
        row={editingRow}
        metadata={statusState.metadata}
        isSubmitting={mutations.isSubmitting}
        conflictMessage={mutations.conflictMessage}
        serverError={mutations.serverError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
      <RuleTestDialog
        open={testOpen}
        status={statusState.status}
        onClose={() => setTestOpen(false)}
      />
      <RuleImportDialog
        open={importOpen}
        metadata={statusState.metadata}
        currentRulesetId={rulesetId}
        onClose={() => setImportOpen(false)}
        onPublished={refreshAll}
        onDownloadErrors={(importId) =>
          void handleDownload(
            () => apiClient.moderation.ruleImports.errors(importId),
            `moderation-import-${importId}-errors.csv`,
          )
        }
      />
    </div>
  );
}
