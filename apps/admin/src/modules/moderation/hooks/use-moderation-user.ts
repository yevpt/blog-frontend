import { useCallback, useState } from "react";
import {
  ApiError,
  type AdminModerationEmergencyBatchResp,
  type AdminModerationProfileReq,
  type AdminModerationProfileResp,
  type AdminModerationSanctionReq,
} from "@repo/api";
import { apiClient } from "../../../lib/api";

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

export interface UseModerationUserResult {
  profile: AdminModerationProfileResp | null;
  batch: BatchState | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  loadProfile: (userId: number) => Promise<void>;
  updateProfile: (req: AdminModerationProfileReq) => Promise<void>;
  muteUser: (req: AdminModerationSanctionReq) => Promise<void>;
  banUser: (req: AdminModerationSanctionReq) => Promise<void>;
  releaseUser: () => Promise<void>;
  hideContentBatch: (req: HideBatchReq) => Promise<void>;
  restoreContentBatch: (req: HideBatchReq) => Promise<void>;
  resetProfile: () => void;
  reload: () => Promise<void>;
}

function toError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  if (err instanceof ApiError) return err;
  return new Error(fallback);
}

export function useModerationUser(): UseModerationUserResult {
  const [profile, setProfile] = useState<AdminModerationProfileResp | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshProfile = useCallback(async (userId: number) => {
    const latest = await apiClient.moderation.getUserProfile(userId);
    setProfile(latest);
  }, []);

  const loadProfile = useCallback(
    async (userId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        await refreshProfile(userId);
        setBatch(null);
      } catch (err) {
        setError(toError(err, "加载用户画像失败"));
        setProfile(null);
        setBatch(null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshProfile],
  );

  const runSaving = useCallback(async (action: () => Promise<unknown>, fallback: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toError(err, fallback));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateProfile = useCallback(
    (req: AdminModerationProfileReq) =>
      runSaving(async () => {
        if (!profile) return;
        await apiClient.moderation.updateUserProfile(profile.user_id, req);
        await refreshProfile(profile.user_id);
      }, "更新用户画像失败"),
    [profile, refreshProfile, runSaving],
  );

  const muteUser = useCallback(
    (req: AdminModerationSanctionReq) =>
      runSaving(async () => {
        if (!profile) return;
        await apiClient.moderation.muteUser(profile.user_id, req);
        await refreshProfile(profile.user_id);
      }, "禁言用户失败"),
    [profile, refreshProfile, runSaving],
  );

  const banUser = useCallback(
    (req: AdminModerationSanctionReq) =>
      runSaving(async () => {
        if (!profile) return;
        await apiClient.moderation.banUser(profile.user_id, req);
        await refreshProfile(profile.user_id);
      }, "封禁用户失败"),
    [profile, refreshProfile, runSaving],
  );

  const releaseUser = useCallback(
    () =>
      runSaving(async () => {
        if (!profile) return;
        await apiClient.moderation.releaseUser(profile.user_id);
        await refreshProfile(profile.user_id);
      }, "解除处罚失败"),
    [profile, refreshProfile, runSaving],
  );

  const hideContentBatch = useCallback(
    (req: HideBatchReq) =>
      runSaving(async () => {
        if (!profile) return;
        const resp: AdminModerationEmergencyBatchResp = await apiClient.moderation.hideUserContent(
          profile.user_id,
          {
            cursor: req.cursor,
            limit: req.limit,
            reason: req.reason,
          },
        );
        // 严格单批：不自动继续下一批，由管理员点击推进
        setBatch({
          operation: "hide",
          processed: resp.processed,
          next_cursor: resp.next_cursor,
          has_more: resp.has_more,
        });
      }, "隐藏用户内容失败"),
    [profile, runSaving],
  );

  const restoreContentBatch = useCallback(
    (req: HideBatchReq) =>
      runSaving(async () => {
        if (!profile) return;
        const resp: AdminModerationEmergencyBatchResp =
          await apiClient.moderation.restoreUserContent(profile.user_id, {
            cursor: req.cursor,
            limit: req.limit,
            reason: req.reason,
          });
        setBatch({
          operation: "restore",
          processed: resp.processed,
          next_cursor: resp.next_cursor,
          has_more: resp.has_more,
        });
      }, "恢复用户内容失败"),
    [profile, runSaving],
  );

  const resetProfile = useCallback(() => {
    setProfile(null);
    setBatch(null);
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    if (!profile) return;

    setIsLoading(true);
    setError(null);
    try {
      await refreshProfile(profile.user_id);
    } catch (err) {
      setError(toError(err, "加载用户画像失败"));
      setProfile(null);
      setBatch(null);
    } finally {
      setIsLoading(false);
    }
  }, [profile, refreshProfile]);

  return {
    profile,
    batch,
    isLoading,
    isSaving,
    error,
    loadProfile,
    updateProfile,
    muteUser,
    banUser,
    releaseUser,
    hideContentBatch,
    restoreContentBatch,
    resetProfile,
    reload,
  };
}
