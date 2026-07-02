import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import {
  MAX_QUEUE_BATCH_SIZE,
  canBatchReviewRow,
  isReviewConflictError,
  type ModerationRow,
} from "../model";
import type { UseModerationListResult } from "./use-moderation-list";

interface BatchResult {
  succeeded: number;
  failed: number;
}

async function runBatchAction(
  rows: ModerationRow[],
  action: (row: ModerationRow) => Promise<void>,
): Promise<BatchResult> {
  let succeeded = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await action(row);
      succeeded += 1;
    } catch (err) {
      failed += 1;
      if (!isReviewConflictError(err) && !(err instanceof ApiError)) {
        throw err;
      }
    }
  }
  return { succeeded, failed };
}

function batchToast(actionLabel: string, result: BatchResult) {
  if (result.succeeded === 0) {
    addToast(`${actionLabel}失败，请刷新列表后重试`, "error");
    return;
  }
  if (result.failed === 0) {
    addToast(`已${actionLabel} ${result.succeeded} 条`, "success");
    return;
  }
  addToast(`已${actionLabel} ${result.succeeded} 条，${result.failed} 条失败`, "info");
}

/** 审核队列多选与批量通过/驳回。 */
export function useModerationBatchReview(list: UseModerationListResult) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const selectableRows = useMemo(() => list.rows.filter(canBatchReviewRow), [list.rows]);

  const selectedRows = useMemo(
    () => list.rows.filter((row) => selectedRowIds.has(row.rowId) && canBatchReviewRow(row)),
    [list.rows, selectedRowIds],
  );

  useEffect(() => {
    const validIds = new Set(list.rows.map((row) => row.rowId));
    setSelectedRowIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [list.rows]);

  const toggleSelect = useCallback((rowId: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedRowIds(new Set());
        return;
      }
      setSelectedRowIds(new Set(selectableRows.map((row) => row.rowId)));
    },
    [selectableRows],
  );

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const finishBatch = useCallback(
    async (actionLabel: string, result: BatchResult) => {
      batchToast(actionLabel, result);
      clearSelection();
      await list.refetch();
    },
    [clearSelection, list],
  );

  const batchApprove = useCallback(async () => {
    if (selectedRows.length === 0 || selectedRows.length > MAX_QUEUE_BATCH_SIZE) return;
    setIsBusy(true);
    try {
      const result = await runBatchAction(selectedRows, (row) =>
        apiClient.moderation.approveItem(row.itemId, {
          revision_id: row.revisionId,
          lock_version: row.lockVersion,
          reason: "",
        }),
      );
      await finishBatch("通过", result);
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : "批量通过失败，请稍后重试", "error");
    } finally {
      setIsBusy(false);
    }
  }, [finishBatch, selectedRows]);

  const batchReject = useCallback(
    async (reason: string) => {
      if (selectedRows.length === 0 || selectedRows.length > MAX_QUEUE_BATCH_SIZE) return;
      setIsBusy(true);
      try {
        const result = await runBatchAction(selectedRows, (row) =>
          apiClient.moderation.rejectItem(row.itemId, {
            revision_id: row.revisionId,
            lock_version: row.lockVersion,
            reason,
          }),
        );
        setRejectDialogOpen(false);
        await finishBatch("驳回", result);
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "批量驳回失败，请稍后重试", "error");
      } finally {
        setIsBusy(false);
      }
    },
    [finishBatch, selectedRows],
  );

  return {
    selectedRowIds,
    selectedCount: selectedRows.length,
    selectableCount: selectableRows.length,
    isBusy,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    batchApprove,
    rejectDialogOpen,
    setRejectDialogOpen,
    batchReject,
  };
}
