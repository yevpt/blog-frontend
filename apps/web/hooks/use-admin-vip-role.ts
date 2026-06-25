"use client";

import { useCallback, useState } from "react";
import type { AdminUserRolesResp } from "@repo/api";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";

export function useAdminVipRole(userId: number, onRolesChange: (roles: string[]) => void) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (action: "grant" | "revoke") => {
      setIsPending(true);
      try {
        const data = await apiJson<AdminUserRolesResp>(`/api/admin/users/${userId}/roles/vip`, {
          method: action === "grant" ? "POST" : "DELETE",
        });
        onRolesChange(data.roles);
      } catch (err) {
        addToast(getApiErrorMessage(err, "操作失败"), "error");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [userId, onRolesChange],
  );

  const grantVip = useCallback(() => mutate("grant"), [mutate]);
  const revokeVip = useCallback(() => mutate("revoke"), [mutate]);

  return { grantVip, revokeVip, isPending };
}
