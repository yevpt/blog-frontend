"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { CaptchaChallengeResp, UserResp } from "@repo/api";
import { compressAvatarImage, getAvatarProcessingErrorMessage } from "@repo/hooks";
import { addToast } from "@/lib/toast";
import { useCaptchaToken } from "./use-captcha-token";

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePassword(value: string): string | null {
  if (!value) return "请设置密码";
  if (value.length < 8) return "密码不能少于 8 位";
  if (!/[a-zA-Z]/.test(value)) return "密码需包含英文字母";
  if (!/[0-9]/.test(value)) return "密码需包含数字";
  return null;
}

interface ApiResponse<T> {
  code: number;
  error_code?: string;
  message: string;
  data?: T;
}

class RegisterApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly errorCode: string | null = null,
  ) {
    super(message);
    this.name = "RegisterApiError";
  }
}

/** 注册图形验证码挑战类型，等价于 @repo/api 的 CaptchaChallengeResp（保持对外名稳定） */
export type CaptchaChallenge = CaptchaChallengeResp;

export interface UseRegisterFormOptions {
  onSuccess: (user: UserResp) => void;
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

async function requestRegisterApi<T>(url: string, init: FetchInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (json.code !== 0) {
    throw new RegisterApiError(json.message || "请求失败", json.code, json.error_code ?? null);
  }
  return json.data as T;
}

export function useRegisterForm({ onSuccess }: UseRegisterFormOptions) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCompressing, setAvatarCompressing] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const emailError =
    emailTouched || submitAttempted
      ? !email.trim()
        ? "请输入邮箱地址"
        : !isValidEmail(email)
          ? "邮箱格式不正确"
          : null
      : null;

  const passwordError = passwordTouched || submitAttempted ? validatePassword(password) : null;
  const codeError = submitAttempted && !code.trim() ? "请输入验证码" : null;
  const canSendCode = isValidEmail(email) && !loading && countdown === 0;

  const sendBtnLabel = loading
    ? "处理中"
    : countdown > 0
      ? `重新发送 (${countdown}s)`
      : codeSent
        ? "重新发送"
        : "获取验证码";

  const sendEmailCode = useCallback(
    async (captchaToken: string) => {
      await requestRegisterApi<void>("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captcha_token: captchaToken }),
      });
      setCodeSent(true);
      setCountdown(60);
    },
    [email],
  );

  // 复用通用图形验证码编排：拿到 token 后发码，429 弹 toast，其它失败重拉挑战
  const captcha = useCaptchaToken({
    onToken: sendEmailCode,
    onRateLimited: (message) => addToast(message, "error"),
    onError: (message, errorCode) => {
      setApiError(message);
      setEmailTaken(errorCode === "AUTH_EMAIL_TAKEN");
    },
  });
  const { openCaptcha: openCaptchaChallenge, closeCaptcha } = captcha;

  // 注册场景在拉挑战前先做邮箱校验，并接管 loading / apiError 展示
  const openCaptcha = useCallback(async () => {
    if (!isValidEmail(email)) {
      return;
    }
    setLoading(true);
    setApiError(null);
    setEmailTaken(false);
    try {
      await openCaptchaChallenge();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "图形验证码加载失败");
    } finally {
      setLoading(false);
    }
  }, [email, openCaptchaChallenge]);

  const submitRegistration = useCallback(async () => {
    setSubmitAttempted(true);
    setApiError(null);
    setEmailTaken(false);

    if (!isValidEmail(email) || validatePassword(password) !== null || !code.trim()) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("code", code);
      if (nickname.trim()) {
        formData.append("nickname", nickname.trim());
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile, avatarFile.name);
      }

      const result = await requestRegisterApi<{ user?: UserResp }>("/api/auth/register", {
        method: "POST",
        body: formData,
      });
      if (!result?.user) {
        throw new RegisterApiError("注册失败，请稍后重试", -1);
      }
      onSuccess(result.user);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [avatarFile, code, email, nickname, onSuccess, password]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitRegistration();
    },
    [submitRegistration],
  );

  const handleAvatarChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarCompressing(true);
    try {
      const compressed = await compressAvatarImage(file);
      setAvatarFile(compressed);
      setAvatarPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(compressed);
      });
    } catch (err) {
      addToast(getAvatarProcessingErrorMessage(err), "error");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
      setAvatarCompressing(false);
    }
  }, []);

  const handleAvatarRemove = useCallback((fileInput: HTMLInputElement | null) => {
    setAvatarFile(null);
    setAvatarPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    if (fileInput) {
      fileInput.value = "";
    }
  }, []);

  const openAvatarPicker = useCallback(() => {
    if (avatarCompressing) {
      return;
    }
    fileInputRef.current?.click();
  }, [avatarCompressing]);

  return {
    showPassword,
    setShowPassword,
    avatarPreview,
    avatarCompressing,
    email,
    setEmail,
    code,
    setCode,
    password,
    setPassword,
    nickname,
    setNickname,
    apiError,
    emailTaken,
    loading,
    codeSent,
    countdown,
    emailTouched,
    setEmailTouched,
    passwordTouched,
    setPasswordTouched,
    submitAttempted,
    captchaOpen: captcha.captchaOpen,
    captchaChallenge: captcha.captchaChallenge,
    captchaX: captcha.captchaX,
    setCaptchaX: captcha.setCaptchaX,
    captchaLoading: captcha.captchaLoading,
    setCaptchaOpen: captcha.setCaptchaOpen,
    fileInputRef,
    emailError,
    passwordError,
    codeError,
    canSendCode,
    sendBtnLabel,
    openCaptcha,
    handleCaptchaVerify: captcha.handleVerify,
    closeCaptcha,
    handleSubmit,
    submitRegistration,
    handleAvatarChange,
    handleAvatarRemove,
    openAvatarPicker,
  };
}
