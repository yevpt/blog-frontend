import { useCallback, useState } from "react";
import { ApiError } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";
import { isReviewConflictError, mapItemToRow, type ModerationRow } from "../model";
import type { UseModerationListResult } from "./use-moderation-list";

/** 审核详情弹窗及人工/紧急处置动作。 */
export function useModerationReview(list: UseModerationListResult) {
  const [selectedItem, setSelectedItem] = useState<ModerationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openReview = useCallback((row: ModerationRow) => {
    setSelectedItem(row);
    setSubmitError(null);
    setDialogOpen(true);
  }, []);

  const closeReview = useCallback(() => {
    setDialogOpen(false);
    setSelectedItem(null);
    setSubmitError(null);
  }, []);

  const handleConflict = useCallback(
    async (itemId: number) => {
      setSubmitError("审核状态已经变化，已重新获取该内容与列表，请基于最新状态决定下一步。");
      try {
        const fresh = await apiClient.moderation.getItem(itemId);
        setSelectedItem(mapItemToRow(fresh));
      } catch {
        // 单条刷新失败时仍刷新列表，避免继续基于旧队列操作。
      }
      await list.refetch();
    },
    [list],
  );

  const runReviewAction = useCallback(
    async (action: () => Promise<{ item_id: number }>, successMessage: string, itemId: number) => {
      setIsSaving(true);
      setSubmitError(null);
      try {
        await action();
        addToast(successMessage, "success");
        await list.refetch();
        setDialogOpen(false);
      } catch (err) {
        if (isReviewConflictError(err)) {
          await handleConflict(itemId);
        } else {
          setSubmitError(err instanceof ApiError ? err.message : "操作失败，请稍后重试");
        }
      } finally {
        setIsSaving(false);
      }
    },
    [handleConflict, list],
  );

  const handleApprove = useCallback(
    (reason: string) => {
      if (!selectedItem) return Promise.resolve();
      return runReviewAction(
        () =>
          apiClient.moderation.approveItem(selectedItem.itemId, {
            revision_id: selectedItem.revisionId,
            lock_version: selectedItem.lockVersion,
            reason,
          }),
        "已通过审核",
        selectedItem.itemId,
      );
    },
    [runReviewAction, selectedItem],
  );

  const handleReject = useCallback(
    (reason: string) => {
      if (!selectedItem) return Promise.resolve();
      return runReviewAction(
        () =>
          apiClient.moderation.rejectItem(selectedItem.itemId, {
            revision_id: selectedItem.revisionId,
            lock_version: selectedItem.lockVersion,
            reason,
          }),
        "已驳回",
        selectedItem.itemId,
      );
    },
    [runReviewAction, selectedItem],
  );

  const handleCorrect = useCallback(
    (content: string, reason: string) => {
      if (!selectedItem) return Promise.resolve();
      return runReviewAction(
        () =>
          apiClient.moderation.correctItem(selectedItem.itemId, {
            revision_id: selectedItem.revisionId,
            lock_version: selectedItem.lockVersion,
            content,
            reason,
          }),
        "已修正并通过",
        selectedItem.itemId,
      );
    },
    [runReviewAction, selectedItem],
  );

  const handleHide = useCallback(
    async (reason: string) => {
      if (!selectedItem) return;
      setIsSaving(true);
      setSubmitError(null);
      try {
        await apiClient.moderation.hideItem(selectedItem.itemId, { reason });
        addToast("已紧急隐藏", "success");
        await list.refetch();
        setDialogOpen(false);
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.message : "隐藏失败，请稍后重试");
      } finally {
        setIsSaving(false);
      }
    },
    [list, selectedItem],
  );

  const handleRestore = useCallback(async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      await apiClient.moderation.restoreItem(selectedItem.itemId);
      addToast("已恢复对外公开", "success");
      await list.refetch();
      setDialogOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "恢复失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }, [list, selectedItem]);

  return {
    openReview,
    dialogProps: {
      open: dialogOpen,
      item: selectedItem,
      isSaving,
      submitError,
      onClose: closeReview,
      onApprove: handleApprove,
      onReject: handleReject,
      onCorrect: handleCorrect,
      onHide: handleHide,
      onRestore: handleRestore,
    },
  };
}
