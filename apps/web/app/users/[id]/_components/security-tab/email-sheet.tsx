"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Input, Button } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useCaptchaToken } from "@/hooks/use-captcha-token";
import { RegisterCaptcha } from "@/components/auth/register-captcha";

interface EmailSheetProps {
  open: boolean;
  /** 操作目标：主邮箱 / 副邮箱 */
  target: "main" | "sub";
  /** 当前邮箱（用于区分「换绑」与「添加」标题），无则为 null */
  currentEmail: string | null;
  onClose: () => void;
  /** 换绑成功回调（容器据此 reload） */
  onSuccess: () => void;
}

// 发码倒计时秒数；6 位数字验证码
const COUNTDOWN_SECONDS = 60;
const CODE_LENGTH = 6;
// 简单邮箱校验：用于「获取验证码」按钮可用性，最终以后端为准
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 邮箱换绑/添加底部 Sheet：新邮箱 → 图形验证 → 邮箱验证码（发往新邮箱）→ 提交换绑 */
export function EmailSheet({ open, target, currentEmail, onClose, onSuccess }: EmailSheetProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // 倒计时计时器引用，卸载/关闭时清理避免泄漏
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // 启动 60s 倒计时（发码成功后调用）
  function startCountdown() {
    clearTimer();
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // 图形验证通过拿到一次性 token 后，向新邮箱发码并开始倒计时
  const captcha = useCaptchaToken({
    onToken: async (captchaToken) => {
      await apiJson<void>("/api/users/me/email/code", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), captcha_token: captchaToken }),
      });
      startCountdown();
    },
    onRateLimited: (message) => addToast(message, "error"),
  });

  // Sheet 由关闭→打开时重置内部状态，避免上次输入/倒计时残留
  useEffect(() => {
    if (open) {
      setEmail("");
      setCode("");
      setCountdown(0);
      clearTimer();
    }
  }, [open]);

  // 卸载时清理计时器
  useEffect(() => () => clearTimer(), []);

  const title = target === "main" ? "换绑主邮箱" : currentEmail ? "换绑副邮箱" : "添加副邮箱";

  const codeValid = code.trim().length === CODE_LENGTH;
  const submitDisabled = !emailValid || !codeValid || submitting;
  // 邮箱非法或倒计时中禁止再次获取验证码
  const sendDisabled = !emailValid || countdown > 0 || submitting;

  async function handleSubmit() {
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      await apiJson<void>("/api/users/me/email", {
        method: "PATCH",
        body: JSON.stringify({ target, email: email.trim(), code: code.trim() }),
      });
      addToast("邮箱已更新", "success");
      onSuccess();
    } catch (err) {
      addToast(getApiErrorMessage(err, "操作失败"), "error");
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
      aria-label={title}
    >
      <div className="flex flex-col gap-5 p-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>

        <Input
          label="新邮箱"
          type="email"
          value={email}
          onChange={setEmail}
          isDisabled={submitting}
        />

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="邮箱验证码" value={code} onChange={setCode} isDisabled={submitting} />
          </div>
          <Button
            variant="outline"
            onPress={() => void captcha.openCaptcha()}
            isDisabled={sendDisabled}
          >
            {countdown > 0 ? `${countdown}s 后重试` : "获取验证码"}
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={submitting}>
            取消
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={submitDisabled}
            isLoading={submitting}
            loadingText="提交中…"
          >
            确认
          </Button>
        </div>
      </div>

      <RegisterCaptcha
        challenge={captcha.captchaChallenge}
        captchaX={captcha.captchaX}
        captchaOpen={captcha.captchaOpen}
        captchaLoading={captcha.captchaLoading}
        onOpenChange={captcha.setCaptchaOpen}
        onCaptchaXChange={captcha.setCaptchaX}
        onVerify={captcha.handleVerify}
        onClose={captcha.closeCaptcha}
      />
    </Modal>
  );
}
