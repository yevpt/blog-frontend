import { useCallback, useEffect, useState } from "react";
import { ApiError, type AdminUserDetailResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

export interface UseUserDetailResult {
  detail: AdminUserDetailResp | null;
  isLoading: boolean;
  error: Error | null;
  isMutating: boolean;
  reload: () => Promise<void>;
  grantVip: () => Promise<void>;
  revokeVip: () => Promise<void>;
  disableAccount: () => Promise<void>;
  enableAccount: () => Promise<void>;
}

export function useUserDetail(userId: number | null): UseUserDetailResult {
  const [detail, setDetail] = useState<AdminUserDetailResp | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const reload = useCallback(async () => {
    if (userId === null) {
      setDetail(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setDetail(await apiClient.users.getAdminDetail(userId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("加载用户详情失败"));
      setDetail(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runMutation = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setIsMutating(true);
      try {
        await action();
        addToast(successMessage, "success");
        await reload();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "操作失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [reload],
  );

  const grantVip = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.grantVipRole(userId), "已授予 VIP");
  }, [runMutation, userId]);

  const revokeVip = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.revokeVipRole(userId), "已取消 VIP");
  }, [runMutation, userId]);

  const disableAccount = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.disableAccount(userId), "已禁用账号");
  }, [runMutation, userId]);

  const enableAccount = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.enableAccount(userId), "已启用账号");
  }, [runMutation, userId]);

  return {
    detail,
    isLoading,
    error,
    isMutating,
    reload,
    grantVip,
    revokeVip,
    disableAccount,
    enableAccount,
  };
}
