import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  type AdminModerationControlReq,
  type AdminModerationControlResp,
  type ModerationPublishingMode,
  type ModerationRegistrationMode,
} from "@repo/api";
import { apiClient } from "../../../lib/api";

export interface ControlDraft {
  registration_mode: ModerationRegistrationMode;
  publishing_mode: ModerationPublishingMode;
  reason: string;
}

export interface UseModerationControlResult {
  control: AdminModerationControlResp | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  saveControl: (draft: ControlDraft) => Promise<void>;
  reload: () => Promise<void>;
}

const CONTROL_CONFLICT_CODE = "MODERATION_CONTROL_CONFLICT";

function isControlConflict(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.code === CONTROL_CONFLICT_CODE;
}

export function useModerationControl(): UseModerationControlResult {
  const [control, setControl] = useState<AdminModerationControlResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadControl() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.moderation.getControl();
        if (cancelled) return;
        setControl(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载全站控制失败"));
        setControl(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadControl();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const saveControl = useCallback(
    async (draft: ControlDraft) => {
      if (!control) return;
      const req: AdminModerationControlReq = {
        registration_mode: draft.registration_mode,
        publishing_mode: draft.publishing_mode,
        reason: draft.reason,
        lock_version: control.lock_version,
      };

      setIsSaving(true);
      setError(null);
      try {
        const next = await apiClient.moderation.updateControl(req);
        setControl(next);
      } catch (err) {
        if (isControlConflict(err)) {
          // 冲突时重新加载服务端最新值，不覆盖
          await reload();
          setError(err instanceof Error ? err : new Error("控制状态已被其他管理员更新"));
        } else {
          setError(err instanceof Error ? err : new Error("保存全站控制失败"));
        }
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [control, reload],
  );

  return {
    control,
    isLoading,
    isSaving,
    error,
    saveControl,
    reload,
  };
}
