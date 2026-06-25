"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Input, Button } from "@repo/ui";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { addToast } from "@/lib/toast";
import { useCaptchaToken } from "@/hooks/use-captcha-token";
import { RegisterCaptcha } from "@/components/auth/register-captcha";
import { PasswordRecoveryForm } from "./password-recovery-form";

interface PasswordSheetProps {
  open: boolean;
  /** 当前是否已设置密码：true → 修改(A)；false → 设初始(C) */
  passwordSet: boolean;
  /** 主邮箱（设初始/找回发码主体），未绑定为 null */
  mainEmail: string | null;
  onClose: () => void;
  /** 改密/设初始/找回成功回调（容器据此登出） */
  onSuccess: () => void;
}

// 发码倒计时秒数；新密码最小长度
const COUNTDOWN_SECONDS = 60;
const MIN_PASSWORD_LEN = 8;

/** A=修改密码视图 / C=设置初始密码视图 / recover=邮箱找回视图 */
type View = "change" | "initial" | "recover";

/** 密码 Sheet：按 passwordSet 选默认视图。
 * 已设密码 → 修改(A)，底部可切找回(B)；未设密码 → 设初始(C)。 */
export function PasswordSheet({
  open,
  passwordSet,
  mainEmail,
  onClose,
  onSuccess,
}: PasswordSheetProps) {
  // 视图：已设密码默认改密，未设默认设初始
  const [view, setView] = useState<View>(passwordSet ? "change" : "initial");

  // A 视图状态：当前密码 / 新密码 / 确认新密码
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // C 视图状态：验证码 / 新密码 / 倒计时
  const [code, setCode] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
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

  // C 视图图形验证通过后，向主邮箱发账号验证码
  const captcha = useCaptchaToken({
    onToken: async (captchaToken) => {
      if (!mainEmail) return;
      await apiJson<void>("/api/users/me/email/code", {
        method: "POST",
        body: JSON.stringify({ email: mainEmail, captcha_token: captchaToken }),
      });
      startCountdown();
    },
    onRateLimited: (message) => addToast(message, "error"),
  });

  // Sheet 由关闭→打开时重置内部状态（视图回默认、清空输入/验证码/倒计时）
  useEffect(() => {
    if (open) {
      setView(passwordSet ? "change" : "initial");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCode("");
      setInitialPassword("");
      setCountdown(0);
      clearTimer();
    }
  }, [open, passwordSet]);

  useEffect(() => () => clearTimer(), []);

  // 改密(A) 成功后登出
  async function handleChangeSubmit() {
    if (changeDisabled) return;
    setSubmitting(true);
    try {
      await apiJson<void>("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      addToast("密码已修改，请重新登录", "success");
      onSuccess();
    } catch (err) {
      addToast(getApiErrorMessage(err, "修改失败"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  // 设初始(C) 成功后登出
  async function handleInitialSubmit() {
    if (initialDisabled) return;
    setSubmitting(true);
    try {
      await apiJson<void>("/api/users/me/password/initial", {
        method: "PATCH",
        body: JSON.stringify({ new_password: initialPassword, code: code.trim() }),
      });
      addToast("密码已设置，请重新登录", "success");
      onSuccess();
    } catch (err) {
      addToast(getApiErrorMessage(err, "设置失败"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  // A 视图：新密码≥8 且两次一致
  const newPasswordValid = newPassword.length >= MIN_PASSWORD_LEN;
  const confirmMatch = confirmPassword === newPassword;
  const changeDisabled =
    oldPassword.length === 0 || !newPasswordValid || !confirmMatch || submitting;

  // C 视图：验证码非空 + 新密码≥8 + 主邮箱存在
  const initialPasswordValid = initialPassword.length >= MIN_PASSWORD_LEN;
  const codeValid = code.trim().length > 0;
  const initialDisabled = !mainEmail || !codeValid || !initialPasswordValid || submitting;
  const sendDisabled = countdown > 0 || submitting;

  const title = passwordSet ? "修改密码" : "设置密码";

  function renderBody() {
    // B 视图：邮箱找回（复用 PasswordRecoveryForm）
    if (view === "recover") {
      if (!mainEmail) {
        return <p className="text-sm text-muted-foreground">请先绑定主邮箱后再使用邮箱找回。</p>;
      }
      return <PasswordRecoveryForm email={mainEmail} onDone={onSuccess} />;
    }

    // C 视图：设置初始密码
    if (view === "initial") {
      if (!mainEmail) {
        return (
          <p className="text-sm text-muted-foreground">
            设置初始密码需通过主邮箱验证，请先绑定主邮箱。
          </p>
        );
      }
      return (
        <>
          <p className="text-sm text-muted-foreground">
            你的账号尚未设置密码，将通过主邮箱验证后设置。
          </p>
          <Input label="主邮箱" value={mainEmail} onChange={() => {}} isReadOnly isDisabled />
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
            value={initialPassword}
            onChange={setInitialPassword}
            isDisabled={submitting}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onPress={onClose} isDisabled={submitting}>
              取消
            </Button>
            <Button
              onPress={() => void handleInitialSubmit()}
              isDisabled={initialDisabled}
              isLoading={submitting}
              loadingText="提交中…"
            >
              设置密码
            </Button>
          </div>
        </>
      );
    }

    // A 视图：修改密码
    return (
      <>
        <Input
          label="当前密码"
          type="password"
          value={oldPassword}
          onChange={setOldPassword}
          isDisabled={submitting}
        />
        <Input
          label="新密码（至少 8 位）"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          isDisabled={submitting}
        />
        <Input
          label="确认新密码"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          isDisabled={submitting}
        />
        {confirmPassword.length > 0 && !confirmMatch ? (
          <p className="text-xs text-destructive">两次输入的新密码不一致</p>
        ) : null}
        {mainEmail ? (
          <Button
            variant="text"
            size="sm"
            onPress={() => setView("recover")}
            className="self-start text-xs text-primary hover:underline"
          >
            忘记原密码？用邮箱找回
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">忘记原密码？请先绑定主邮箱后用邮箱找回</p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onPress={onClose} isDisabled={submitting}>
            取消
          </Button>
          <Button
            onPress={() => void handleChangeSubmit()}
            isDisabled={changeDisabled}
            isLoading={submitting}
            loadingText="提交中…"
          >
            确认修改
          </Button>
        </div>
      </>
    );
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
        <h2 className="text-base font-semibold text-foreground">
          {view === "recover" ? "邮箱找回密码" : title}
        </h2>
        {renderBody()}
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
