import { useEffect, useState } from "react";
import type { AdminOperationLogItemResp } from "@repo/api";
import { apiClient } from "../../../lib/api";

const ACTION_LABELS: Record<string, string> = {
  grant_vip: "授予 VIP",
  revoke_vip: "取消 VIP",
  disable_account: "禁用账号",
  enable_account: "启用账号",
  mute: "禁言",
  ban: "封禁",
  release: "解除处罚",
  update_trust_level: "调整信任等级",
  clear_avatar: "清除头像",
};

export function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function useUserOperationLogs(userId: number | null) {
  const [items, setItems] = useState<AdminOperationLogItemResp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (userId === null) {
      setItems([]);
      setTotal(0);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiClient.users
      .getOperationLogs(userId, { page, page_size: 10 })
      .then((data) => {
        if (cancelled) return;
        setItems(data.list);
        setTotal(data.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载操作日志失败"));
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, userId]);

  return { items, total, page, setPage, isLoading, error };
}
