"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { UserResp } from "@repo/api";
import { compressAvatarImage, getAvatarProcessingErrorMessage } from "@repo/hooks";
import { addToast } from "@/lib/toast";

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
  message: string;
  data?: T;
}

class RegisterApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = "RegisterApiError";
  }
}

export interface CaptchaChallenge {
  challenge_id: string;
  master_image: string;
  tile_image: string;
  tile_x: number;
  tile_y: number;
  tile_width: number;
  tile_height: number;
  image_width: number;
  image_height: number;
}

interface CaptchaVerifyResp {
  captcha_token: string;
}

export interface UseRegisterFormOptions {
  onSuccess: (user: UserResp) => void;
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

async function requestRegisterApi<T>(url: string, init: FetchInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as ApiResponse<T>;
  if (json.code !== 0) {
    throw new RegisterApiError(json.message || "请求失败", json.code);
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
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [captchaX, setCaptchaX] = useState(0);
  const [captchaLoading, setCaptchaLoading] = useState(false);

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

  const closeCaptcha = useCallback(() => {
    setCaptchaOpen(false);
    setCaptchaChallenge(null);
  }, []);

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

  const openCaptcha = useCallback(async () => {
    if (!isValidEmail(email)) {
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const challenge = await requestRegisterApi<CaptchaChallenge>(
        "/api/captcha/register/challenge",
        { method: "POST" },
      );
      setCaptchaChallenge(challenge);
      setCaptchaX(challenge.tile_x);
      setCaptchaOpen(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "图形验证码加载失败");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleCaptchaVerify = useCallback(
    async (x: number) => {
      if (!captchaChallenge) {
        return;
      }
      setCaptchaLoading(true);
      try {
        const result = await requestRegisterApi<CaptchaVerifyResp>("/api/captcha/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge_id: captchaChallenge.challenge_id,
            x,
            y: captchaChallenge.tile_y,
          }),
        });
        await sendEmailCode(result.captcha_token);
        closeCaptcha();
      } catch (err) {
        if (err instanceof RegisterApiError && err.code === 429) {
          closeCaptcha();
          addToast(err.message, "error");
          return;
        }
        try {
          const challenge = await requestRegisterApi<CaptchaChallenge>(
            "/api/captcha/register/challenge",
            { method: "POST" },
          );
          setCaptchaChallenge(challenge);
          setCaptchaX(challenge.tile_x);
        } catch {
          closeCaptcha();
        }
      } finally {
        setCaptchaLoading(false);
      }
    },
    [captchaChallenge, closeCaptcha, sendEmailCode],
  );

  const submitRegistration = useCallback(async () => {
    setSubmitAttempted(true);
    setApiError(null);

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

      const { user } = await requestRegisterApi<{ user: UserResp }>("/api/auth/register", {
        method: "POST",
        body: formData,
      });
      onSuccess(user);
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
    loading,
    codeSent,
    countdown,
    emailTouched,
    setEmailTouched,
    passwordTouched,
    setPasswordTouched,
    submitAttempted,
    captchaOpen,
    captchaChallenge,
    captchaX,
    setCaptchaX,
    captchaLoading,
    setCaptchaOpen,
    fileInputRef,
    emailError,
    passwordError,
    codeError,
    canSendCode,
    sendBtnLabel,
    openCaptcha,
    handleCaptchaVerify,
    closeCaptcha,
    handleSubmit,
    submitRegistration,
    handleAvatarChange,
    handleAvatarRemove,
    openAvatarPicker,
  };
}
