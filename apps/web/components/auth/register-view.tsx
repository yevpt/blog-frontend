"use client";

import {
  type PointerEvent,
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";
import { addToast } from "@/lib/toast";

function inputCls(hasError?: boolean) {
  return cn(
    "w-full px-4 py-[9px] text-sm rounded-xl bg-foreground/5 border placeholder:text-muted-foreground/50 focus:outline-none transition-colors",
    hasError
      ? "border-destructive/50 bg-destructive/[0.03] focus:border-destructive/60"
      : "border-border focus:border-primary/50 focus:bg-primary/[0.06]",
  );
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePassword(v: string): string | null {
  if (!v) return "请设置密码";
  if (v.length < 8) return "密码不能少于 8 位";
  if (!/[a-zA-Z]/.test(v)) return "密码需包含英文字母";
  if (!/[0-9]/.test(v)) return "密码需包含数字";
  return null;
}

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

interface CaptchaChallenge {
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

// ── 自定义拼图滑块 ─────────────────────────────────────────────
class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const THUMB_W = 44;

interface SliderProps {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (x: number) => void;
  onRelease: (x: number) => void;
}

function CaptchaSlider({ value, max, disabled, onChange, onRelease }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  function calcValue(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const usable = rect.width - THUMB_W;
    if (usable <= 0) return 0;
    const raw = (clientX - rect.left - THUMB_W / 2) / usable;
    return Math.max(0, Math.min(max, Math.round(raw * max)));
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    isDragging.current = true;
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    onChange(calcValue(e.clientX));
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || disabled) return;
    onChange(calcValue(e.clientX));
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (e.currentTarget.releasePointerCapture) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const x = calcValue(e.clientX);
    onChange(x);
    onRelease(x);
  }

  const fraction = max > 0 ? value / max : 0;
  const fillW = `calc(${fraction * 100}% + ${THUMB_W * (1 - fraction)}px)`;
  const thumbLeft = `calc(${fraction * 100}% - ${fraction * THUMB_W}px)`;

  return (
    <div
      ref={trackRef}
      data-testid="captcha-track"
      className={cn(
        "relative w-full h-[44px] rounded-lg select-none touch-none overflow-hidden",
        "bg-foreground/[0.06]",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 进度填充 */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/[0.12] pointer-events-none"
        style={{ width: fillW }}
      />
      {/* 提示文字 */}
      {fraction < 0.08 && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[12px] text-muted-foreground/40 pl-14 select-none">
            向右拖动完成验证
          </span>
        </div>
      )}
      {/* 滑块手柄 */}
      <div
        className={cn(
          "absolute top-[4px] bottom-[4px] flex items-center justify-center pointer-events-none",
          "rounded-[9px] bg-white dark:bg-zinc-100 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.18)]",
        )}
        style={{ width: THUMB_W, left: thumbLeft }}
      >
        {disabled ? (
          <div className="w-[18px] h-[18px] border-[2.5px] border-gray-200 border-t-primary rounded-full animate-spin" />
        ) : (
          <div className="flex items-center gap-[3px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-[3px] h-[13px] rounded-full bg-gray-300" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────
export function RegisterView({ onSwitchToLogin }: RegisterViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 验证码发送状态
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 字段级错误（onBlur 或提交后显示）
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // 图形验证码
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [captchaX, setCaptchaX] = useState(0);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
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

  async function requestJSON<T>(url: string, init: Parameters<typeof fetch>[1]): Promise<T> {
    const res = await fetch(url, init);
    const json = (await res.json()) as ApiResponse<T>;
    if (json.code !== 0) throw new ApiError(json.message || "请求失败", json.code);
    return json.data as T;
  }

  async function openCaptcha() {
    if (!isValidEmail(email)) return;
    setLoading(true);
    setApiError(null);
    try {
      const challenge = await requestJSON<CaptchaChallenge>("/api/captcha/register/challenge", {
        method: "POST",
      });
      setCaptchaChallenge(challenge);
      setCaptchaX(challenge.tile_x);
      setCaptchaOpen(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "图形验证码加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailCode(captchaToken: string) {
    await requestJSON<void>("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, captcha_token: captchaToken }),
    });
    setCodeSent(true);
    setCountdown(60);
  }

  async function handleCaptchaVerify(x: number) {
    if (!captchaChallenge) return;
    setCaptchaLoading(true);
    try {
      const result = await requestJSON<CaptchaVerifyResp>("/api/captcha/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: captchaChallenge.challenge_id,
          x,
          y: captchaChallenge.tile_y,
        }),
      });
      await sendEmailCode(result.captcha_token);
      setCaptchaOpen(false);
      setCaptchaChallenge(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === 429) {
        setCaptchaOpen(false);
        setCaptchaChallenge(null);
        addToast(err.message, "error");
        return;
      }
      // 验证失败：自动刷新新一轮拼图
      try {
        const challenge = await requestJSON<CaptchaChallenge>("/api/captcha/register/challenge", {
          method: "POST",
        });
        setCaptchaChallenge(challenge);
        setCaptchaX(challenge.tile_x);
      } catch {
        setCaptchaOpen(false);
        setCaptchaChallenge(null);
      }
    } finally {
      setCaptchaLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitAttempted(true);
    setApiError(null);

    if (!isValidEmail(email) || validatePassword(password) !== null || !code.trim()) {
      return;
    }

    setLoading(true);
    try {
      await requestJSON("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          code,
          ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
        }),
      });
      onSwitchToLogin();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleAvatarRemove(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const sendBtnLabel = loading
    ? "处理中"
    : countdown > 0
      ? `重新发送 (${countdown}s)`
      : codeSent
        ? "重新发送"
        : "获取验证码";

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">创建账号</h2>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <SvgIcon name="chevron-left" size={9} />
            登录
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">填写信息完成注册</p>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-[14px]">
          {/* 邮箱 */}
          <div>
            <input
              type="email"
              placeholder="邮箱地址"
              autoComplete="email"
              className={inputCls(!!emailError)}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              onBlur={() => setEmailTouched(true)}
            />
            {emailError && (
              <p className="mt-1.5 text-[11.5px] text-destructive/80 px-1">{emailError}</p>
            )}
          </div>

          {/* 验证码行：输入框内嵌发送按钮 */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="验证码"
                inputMode="numeric"
                maxLength={6}
                className={cn(inputCls(!!codeError), "pr-[108px]")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                type="button"
                onClick={openCaptcha}
                disabled={!canSendCode}
                className={cn(
                  "absolute right-[5px] top-1/2 -translate-y-1/2",
                  "px-[10px] py-[5px] rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap",
                  canSendCode
                    ? "text-primary hover:bg-primary/10 cursor-pointer"
                    : "text-muted-foreground/40 cursor-not-allowed",
                )}
              >
                {sendBtnLabel}
              </button>
            </div>
            {codeError && (
              <p className="mt-1.5 text-[11.5px] text-destructive/80 px-1">{codeError}</p>
            )}
          </div>

          {/* 密码 */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="设置密码"
                autoComplete="new-password"
                className={cn(inputCls(!!passwordError), "pr-[46px]")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-muted-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-muted-foreground"
              >
                <SvgIcon name={showPassword ? "eye-off" : "eye"} size={15} />
              </button>
            </div>
            {passwordError && (
              <p className="mt-1.5 text-[11.5px] text-destructive/80 px-1">{passwordError}</p>
            )}
          </div>

          <input
            type="text"
            placeholder="昵称（可选）"
            autoComplete="nickname"
            className={inputCls()}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          {/* 头像上传 */}
          <label className="flex items-center gap-[14px] p-[12px_16px] rounded-xl bg-foreground/[0.03] border-[1.5px] border-dashed border-foreground/[0.09] cursor-pointer transition-colors hover:bg-primary/5 hover:border-primary/25">
            <div className="relative w-[38px] h-[38px] flex-shrink-0">
              <div className="w-full h-full rounded-full bg-primary/12 border-[1.5px] border-dashed border-primary/25 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                ) : (
                  <SvgIcon name="user" size={16} className="text-primary/60" />
                )}
              </div>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  aria-label="删除头像"
                  className="absolute -top-[5px] -right-[5px] w-[16px] h-[16px] rounded-full bg-destructive flex items-center justify-center shadow-sm"
                >
                  <SvgIcon name="close" size={8} className="text-white" />
                </button>
              )}
            </div>
            <div>
              <div className="text-[13px] text-muted-foreground">
                {avatarPreview ? "更换头像" : "上传头像"}
              </div>
              <div className="text-[11px] text-muted-foreground/40 mt-[2px]">
                {avatarPreview ? "点击更换，× 删除" : "可选 · JPG / PNG，最大 2MB"}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        {apiError && (
          <p role="alert" className="mt-3 text-[12px] leading-relaxed text-destructive/80">
            {apiError}
          </p>
        )}

        {/* 创建账号按钮 */}
        <Button
          type="submit"
          variant="default"
          className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5"
          isDisabled={loading}
        >
          创建账号
          <SvgIcon name="chevron-right" size={16} />
        </Button>
      </form>

      {/* 分割线 */}
      <div className="flex items-center gap-3 my-[22px] text-[11.5px]">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground flex-shrink-0">其他方式注册</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* OAuth 图标 */}
      <OAuthGrid />

      {/* 图形验证码弹层 — 挂载到 document.body 以脱离父级 stacking context */}
      {captchaOpen &&
        captchaChallenge &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/45 px-4 backdrop-blur-md">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="图形验证码"
              className="w-full max-w-[360px] rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              {/* 头部 */}
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-bold text-foreground">请拖动滑块完成拼图</h3>
                <button
                  type="button"
                  aria-label="关闭图形验证码"
                  onClick={() => {
                    setCaptchaOpen(false);
                    setCaptchaChallenge(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <SvgIcon name="close" size={14} />
                </button>
              </div>

              {/* 验证码统一容器（拼图 + 滑块无缝整合） */}
              <div className="overflow-hidden rounded-xl border border-border">
                {/* 拼图区域 */}
                <div
                  className="relative mx-auto overflow-hidden bg-foreground/[0.03]"
                  style={{
                    width: captchaChallenge.image_width,
                    height: captchaChallenge.image_height,
                    maxWidth: "100%",
                  }}
                >
                  <img
                    src={captchaChallenge.master_image}
                    alt=""
                    className="h-full w-full select-none object-cover"
                    draggable={false}
                  />
                  <img
                    src={captchaChallenge.tile_image}
                    alt=""
                    className="absolute select-none drop-shadow-lg"
                    draggable={false}
                    style={{
                      width: captchaChallenge.tile_width,
                      height: captchaChallenge.tile_height,
                      left: captchaX,
                      top: captchaChallenge.tile_y,
                    }}
                  />
                  {captchaLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                      <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {/* 滑块底栏 */}
                <div className="border-t border-border/50 p-3">
                  <CaptchaSlider
                    value={captchaX}
                    max={Math.max(0, captchaChallenge.image_width - captchaChallenge.tile_width)}
                    disabled={captchaLoading}
                    onChange={(x) => setCaptchaX(x)}
                    onRelease={(x) => handleCaptchaVerify(x)}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
