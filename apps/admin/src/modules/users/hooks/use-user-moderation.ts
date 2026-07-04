import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  type AdminModerationProfileReq,
  type AdminModerationProfileResp,
  type AdminModerationSanctionReq,
} from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

export interface BatchState {
  operation: "hide" | "restore";
  processed: number;
  next_cursor: number;
  has_more: boolean;
}

export interface HideBatchReq {
  cursor: number;
  limit?: number;
  reason?: string;
}

export interface UseUserModerationResult {
  profile: AdminModerationProfileResp | null;
  batch: BatchState | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  updateProfile: (req: AdminModerationProfileReq) => Promise<void>;
  muteUser: (req: AdminModerationSanctionReq) => Promise<void>;
  banUser: (req: AdminModerationSanctionReq) => Promise<void>;
  releaseUser: () => Promise<void>;
  hideContentBatch: (req: HideBatchReq) => Promise<void>;
  restoreContentBatch: (req: HideBatchReq) => Promise<void>;
}

function toError(err: unknown, fallback: string) {
  return err instanceof Error ? err : new Error(fallback);
}

export function useUserModeration(userId: number | null): UseUserModerationResult {
  const [profile, setProfile] = useState<AdminModerationProfileResp | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (userId === null) {
      setProfile(null);
      setBatch(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setProfile(await apiClient.moderation.getUserProfile(userId));
    } catch (err) {
      setError(toError(err, "加载审核画像失败"));
      setProfile(null);
      setBatch(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setBatch(null);
    void reload();
  }, [reload]);

  const runSaving = useCallback(
    async (action: () => Promise<unknown>, successMessage: string, fallback: string) => {
      setIsSaving(true);
      setError(null);
      try {
        await action();
        addToast(successMessage, "success");
      } catch (err) {
        const nextError = toError(err, fallback);
        setError(nextError);
        addToast(err instanceof ApiError ? err.message : fallback, "error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const updateProfile = useCallback(
    async (req: AdminModerationProfileReq) => {
      if (userId === null) return;
      await runSaving(
        async () => {
          await apiClient.moderation.updateUserProfile(userId, req);
          await reload();
        },
        "已更新审核画像",
        "更新审核画像失败",
      );
    },
    [reload, runSaving, userId],
  );

  const muteUser = useCallback(
    async (req: AdminModerationSanctionReq) => {
      if (userId === null) return;
      await runSaving(
        async () => {
          await apiClient.moderation.muteUser(userId, req);
          await reload();
        },
        "已禁言",
        "禁言用户失败",
      );
    },
    [reload, runSaving, userId],
  );

  const banUser = useCallback(
    async (req: AdminModerationSanctionReq) => {
      if (userId === null) return;
      await runSaving(
        async () => {
          await apiClient.moderation.banUser(userId, req);
          await reload();
        },
        "已封禁",
        "封禁用户失败",
      );
    },
    [reload, runSaving, userId],
  );

  const releaseUser = useCallback(async () => {
    if (userId === null) return;
    await runSaving(
      async () => {
        await apiClient.moderation.releaseUser(userId);
        await reload();
      },
      "已解除处罚",
      "解除处罚失败",
    );
  }, [reload, runSaving, userId]);

  const hideContentBatch = useCallback(
    async (req: HideBatchReq) => {
      if (userId === null) return;
      await runSaving(
        async () => {
          const data = await apiClient.moderation.hideUserContent(userId, req);
          setBatch({ operation: "hide", ...data });
        },
        "本批内容已隐藏",
        "隐藏用户内容失败",
      );
    },
    [runSaving, userId],
  );

  const restoreContentBatch = useCallback(
    async (req: HideBatchReq) => {
      if (userId === null) return;
      await runSaving(
        async () => {
          const data = await apiClient.moderation.restoreUserContent(userId, req);
          setBatch({ operation: "restore", ...data });
        },
        "本批内容已恢复",
        "恢复用户内容失败",
      );
    },
    [runSaving, userId],
  );

  return {
    profile,
    batch,
    isLoading,
    isSaving,
    error,
    reload,
    updateProfile,
    muteUser,
    banUser,
    releaseUser,
    hideContentBatch,
    restoreContentBatch,
  };
}
