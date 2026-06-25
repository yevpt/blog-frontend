"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Input, Button } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useCaptchaToken } from "@/hooks/use-captcha-token";
import { RegisterCaptcha } from "@/components/auth/register-captcha";

export type EmailSheetIntent = "bind" | "rebind" | "verify";

interface EmailSheetProps {
  open: boolean;
  target: "main" | "sub";
  intent: EmailSheetIntent;
  /** 当前邮箱（换绑/验证时用于标题与预填），无则为 null */
  currentEmail: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTDOWN_SECONDS = 60;
const CODE_LENGTH = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sheetTitle(target: "main" | "sub", intent: EmailSheetIntent, currentEmail: string | null) {
  if (intent === "verify") return target === "main" ? "验证主邮箱" : "验证副邮箱";
  if (target === "main") return currentEmail ? "换绑主邮箱" : "绑定主邮箱";
  return currentEmail ? "换绑副邮箱" : "添加副邮箱";
}

/** 邮箱绑定/换绑/验证底部 Sheet */
export function EmailSheet({
  open,
  target,
  intent,
  currentEmail,
  onClose,
  onSuccess,
}: EmailSheetProps) {
  const isVerify = intent === "verify";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

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

  useEffect(() => {
    if (open) {
      setEmail(isVerify && currentEmail ? currentEmail : "");
      setCode("");
      setCountdown(0);
      clearTimer();
    }
  }, [open, isVerify, currentEmail]);

  useEffect(() => () => clearTimer(), []);

  const title = sheetTitle(target, intent, currentEmail);
  const codeValid = code.trim().length === CODE_LENGTH;
  const submitDisabled = !emailValid || !codeValid || submitting;
  const sendDisabled = !emailValid || countdown > 0 || submitting;

  async function handleSubmit() {
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      await apiJson<void>("/api/users/me/email", {
        method: "PATCH",
        body: JSON.stringify({ target, email: email.trim(), code: code.trim() }),
      });
      addToast(isVerify ? "邮箱已验证" : "邮箱已更新", "success");
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

        {isVerify ? (
          <p className="text-sm text-muted-foreground">
            验证码将发送至当前邮箱，完成验证后即可用于通知与找回密码。
          </p>
        ) : null}

        <Input
          label={isVerify ? "当前邮箱" : "新邮箱"}
          type="email"
          value={email}
          onChange={setEmail}
          isDisabled={submitting || isVerify}
          isReadOnly={isVerify}
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
