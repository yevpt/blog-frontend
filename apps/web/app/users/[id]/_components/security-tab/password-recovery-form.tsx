"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Button } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useCaptchaToken } from "@/hooks/use-captcha-token";
import { RegisterCaptcha } from "@/components/auth/register-captcha";

interface PasswordRecoveryFormProps {
  /** 找回目标邮箱（主邮箱），只读展示并作为发码/重置主体 */
  email: string;
  /** 重置成功回调（容器据此登出） */
  onDone: () => void;
}

// 发码倒计时秒数；新密码最小长度
const COUNTDOWN_SECONDS = 60;
const MIN_PASSWORD_LEN = 8;

/** 邮箱找回密码表单（可复用：账号安全 + 登录页）。
 * 主邮箱只读 → 图形验证 → 邮箱验证码（password-reset/code）→ 新密码(≥8) → 公开重置(password-reset)。 */
export function PasswordRecoveryForm({ email, onDone }: PasswordRecoveryFormProps) {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // 发码成功后启动 60s 倒计时
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

  // 图形验证通过拿到 token 后，向主邮箱发找回验证码
  const captcha = useCaptchaToken({
    onToken: async (captchaToken) => {
      await apiJson<void>("/api/auth/password-reset/code", {
        method: "POST",
        body: JSON.stringify({ email, captcha_token: captchaToken }),
      });
      startCountdown();
    },
    onRateLimited: (message) => addToast(message, "error"),
  });

  useEffect(() => () => clearTimer(), []);

  const passwordValid = newPassword.length >= MIN_PASSWORD_LEN;
  const codeValid = code.trim().length > 0;
  const submitDisabled = !passwordValid || !codeValid || submitting;
  const sendDisabled = countdown > 0 || submitting;

  async function handleSubmit() {
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      await apiJson<void>("/api/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({ email, code: code.trim(), new_password: newPassword }),
      });
      addToast("密码已重置，请重新登录", "success");
      onDone();
    } catch (err) {
      addToast(getApiErrorMessage(err, "重置失败"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 主邮箱只读展示 */}
      <Input label="主邮箱" value={email} onChange={() => {}} isReadOnly isDisabled />

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

      <Input
        label="新密码（至少 8 位）"
        type="password"
        value={newPassword}
        onChange={setNewPassword}
        isDisabled={submitting}
      />

      <div className="flex items-center justify-end">
        <Button
          onPress={handleSubmit}
          isDisabled={submitDisabled}
          isLoading={submitting}
          loadingText="提交中…"
        >
          重置密码
        </Button>
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
    </div>
  );
}
