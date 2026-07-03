"use client";

import { useCallback, useState } from "react";
import type { CaptchaChallengeResp, CaptchaVerifyResp } from "@repo/api";

/** 后端统一响应包络（部分 mock / 端点直接返回裸数据，故各字段可选） */
interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

/** 携带 HTTP 状态码与业务 code 的错误，便于上层区分 429 限流 */
class CaptchaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | null,
  ) {
    super(message);
    this.name = "CaptchaApiError";
  }
}

/**
 * 统一 POST JSON 请求：
 * - 兼容「裸数据」与「{code,message,data}」两种响应体；
 * - 失败判定对齐现有 requestRegisterApi 语义：业务 code 非 0 视为失败；
 *   仅在响应显式给出 ok=false 时才以 HTTP 状态判失败（避免 mock 无 ok 字段被误判）。
 */
async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  const code = typeof data.code === "number" ? data.code : null;
  const httpFailed = res.ok === false;
  if (httpFailed || (code !== null && code !== 0)) {
    // 429 既可能来自 HTTP 状态，也可能来自业务 code
    const status = code === 429 ? 429 : res.status;
    throw new CaptchaApiError(data.message ?? "请求失败", status, code);
  }
  return (data.data ?? (data as unknown)) as T;
}

/**
 * 命中限流：HTTP 429 或业务 code 429。
 * 结构化判定（而非按类），以兼容 onToken 回调内部抛出的其它错误类型
 * （如注册流程的 RegisterApiError，其 code===429 表示限流）。
 */
function isRateLimited(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const { status, code } = err as { status?: unknown; code?: unknown };
  return status === 429 || code === 429;
}

/**
 * 从 onToken 抛出的业务错误中提取 error_code（若存在）。
 * onToken 由各调用方自行实现（RegisterApiError / ApiClientError 等类型不一），
 * 故用鸭子类型探测而非依赖具体错误类，与 isRateLimited 的做法一致。
 */
function extractErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }
  const { errorCode } = err as { errorCode?: unknown };
  return typeof errorCode === "string" ? errorCode : null;
}

export interface UseCaptchaTokenResult {
  captchaOpen: boolean;
  captchaChallenge: CaptchaChallengeResp | null;
  captchaX: number;
  captchaLoading: boolean;
  setCaptchaX: (x: number) => void;
  setCaptchaOpen: (open: boolean) => void;
  openCaptcha: () => Promise<void>;
  handleVerify: (x: number) => Promise<void>;
  closeCaptcha: () => void;
}

export interface UseCaptchaTokenOptions {
  /** 拿到一次性 captcha_token 后的业务回调（如发码 / 找回密码） */
  onToken: (captchaToken: string) => Promise<void>;
  /** 命中限流（429）时的提示回调 */
  onRateLimited?: (message: string) => void;
  /** onToken 抛出非限流业务错误时的提示回调（如「邮箱已注册」），errorCode 供调用方细分场景 */
  onError?: (message: string, errorCode: string | null) => void;
}

/**
 * 可复用图形验证码编排 hook：拉挑战 → 滑块校验 → 拿一次性 captcha_token。
 * token 通用、一次性、IP 绑定，故统一走 /api/captcha/register/* 端点。
 */
export function useCaptchaToken(opts: UseCaptchaTokenOptions): UseCaptchaTokenResult {
  const { onToken, onRateLimited, onError } = opts;

  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallengeResp | null>(null);
  const [captchaX, setCaptchaX] = useState(0);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const closeCaptcha = useCallback(() => {
    setCaptchaOpen(false);
    setCaptchaChallenge(null);
  }, []);

  const fetchChallenge = useCallback(async () => {
    const challenge = await postJson<CaptchaChallengeResp>("/api/captcha/register/challenge");
    setCaptchaChallenge(challenge);
    setCaptchaX(challenge.tile_x);
    return challenge;
  }, []);

  const openCaptcha = useCallback(async () => {
    await fetchChallenge();
    setCaptchaOpen(true);
  }, [fetchChallenge]);

  const handleVerify = useCallback(
    async (x: number) => {
      if (!captchaChallenge) {
        return;
      }
      setCaptchaLoading(true);

      let verifyResult: CaptchaVerifyResp;
      try {
        verifyResult = await postJson<CaptchaVerifyResp>("/api/captcha/register/verify", {
          challenge_id: captchaChallenge.challenge_id,
          x,
          y: captchaChallenge.tile_y,
        });
      } catch (err) {
        if (isRateLimited(err)) {
          closeCaptcha();
          onRateLimited?.(err instanceof Error ? err.message : "发送过于频繁");
        } else {
          // 滑块验证请求本身失败：重拉一张新挑战，让用户重试；连重拉都失败才关闭
          try {
            await fetchChallenge();
          } catch {
            closeCaptcha();
          }
        }
        setCaptchaLoading(false);
        return;
      }

      try {
        await onToken(verifyResult.captcha_token);
        closeCaptcha();
      } catch (err) {
        // 业务发码请求失败，不是滑块的问题：重拉验证码没有意义，直接关闭并把错误暴露给调用方
        closeCaptcha();
        if (isRateLimited(err)) {
          onRateLimited?.(err instanceof Error ? err.message : "发送过于频繁");
        } else {
          onError?.(err instanceof Error ? err.message : "操作失败", extractErrorCode(err));
        }
      } finally {
        setCaptchaLoading(false);
      }
    },
    [captchaChallenge, closeCaptcha, fetchChallenge, onToken, onRateLimited, onError],
  );

  return {
    captchaOpen,
    captchaChallenge,
    captchaX,
    captchaLoading,
    setCaptchaX,
    setCaptchaOpen,
    openCaptcha,
    handleVerify,
    closeCaptcha,
  };
}
