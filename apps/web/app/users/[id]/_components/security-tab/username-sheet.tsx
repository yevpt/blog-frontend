"use client";

import { useState } from "react";
import { Modal, Input, Button } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";

interface UsernameSheetProps {
  open: boolean;
  /** 当前用户名，作为输入框初值 */
  currentUsername: string;
  onClose: () => void;
  /** 改名成功回调（容器据此触发登出流程） */
  onSuccess: () => void;
}

// 后端用户名约束：3–155 字符
const MIN_LEN = 3;
const MAX_LEN = 155;

/** 用户名修改底部 Sheet：移动端底部弹出、md+ 居中；改完需重新登录 */
export function UsernameSheet({ open, currentUsername, onClose, onSuccess }: UsernameSheetProps) {
  const [username, setUsername] = useState(currentUsername);
  const [submitting, setSubmitting] = useState(false);

  const len = username.trim().length;
  const disabled = len < MIN_LEN || len > MAX_LEN || submitting;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    try {
      await apiJson<void>("/api/users/me/username", {
        method: "PATCH",
        body: JSON.stringify({ username: username.trim() }),
      });
      addToast("用户名已修改，请重新登录", "success");
      onSuccess();
    } catch (err) {
      addToast(getApiErrorMessage(err, "修改失败"), "error");
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
      placement="fullscreen-mobile"
      aria-label="修改用户名"
    >
      <div className="flex flex-col gap-5 p-5">
        <h2 className="text-base font-semibold text-foreground">修改用户名</h2>
        <Input label="用户名" value={username} onChange={setUsername} isDisabled={submitting} />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={submitting}>
            取消
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={disabled}
            isLoading={submitting}
            loadingText="提交中…"
          >
            确认修改
          </Button>
        </div>
      </div>
    </Modal>
  );
}
