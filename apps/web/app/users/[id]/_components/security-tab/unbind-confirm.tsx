"use client";

import { useState } from "react";
import { Modal, Button } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { getProviderMeta } from "./oauth-providers";

interface UnbindConfirmProps {
  open: boolean;
  /** 待解绑的第三方平台 source */
  source: string;
  onClose: () => void;
  /** 解绑成功回调（容器据此刷新列表） */
  onSuccess: () => void;
}

/**
 * 第三方解绑确认弹窗：居中小尺寸 Modal。
 * 后端可能返回业务错误（如「最后的登录方式无法解绑」），此时行内回显且不刷新，仅成功才 onSuccess。
 */
export function UnbindConfirm({ open, source, onClose, onSuccess }: UnbindConfirmProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = getProviderMeta(source).label;

  async function handleUnbind() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiJson<void>(`/api/oauth/bindings/${source}`, { method: "DELETE" });
      addToast("已解绑", "success");
      onSuccess();
    } catch (err) {
      // 后端业务错误（含「最后登录方式」）行内回显并 toast，不关弹窗、不刷新
      const message = getApiErrorMessage(err, "解绑失败");
      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable
      placement="center"
      size="sm"
      aria-label={`解绑 ${label}`}
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold text-foreground">解绑 {label}？</h2>
        <p className="text-sm text-muted-foreground">
          解绑后将无法使用 {label} 账号登录，确定要解绑吗？
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={submitting}>
            取消
          </Button>
          <Button
            variant="default"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onPress={handleUnbind}
            isLoading={submitting}
            loadingText="解绑中…"
          >
            解绑
          </Button>
        </div>
      </div>
    </Modal>
  );
}
