"use client";

import { useState, useRef, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";

const inputCls =
  "w-full px-4 py-[13px] text-sm rounded-xl bg-foreground/5 border border-border placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.06] transition-colors";

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

export function RegisterView({ onSwitchToLogin }: RegisterViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [captchaX, setCaptchaX] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function requestJSON<T>(url: string, init: Parameters<typeof fetch>[1]): Promise<T> {
    const res = await fetch(url, init);
    const json = (await res.json()) as ApiResponse<T>;
    if (json.code !== 0) {
      throw new Error(json.message || "请求失败");
    }
    return json.data as T;
  }

  async function openCaptcha() {
    if (!email.trim()) {
      setStatus("请先填写邮箱地址");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const challenge = await requestJSON<CaptchaChallenge>("/api/captcha/register/challenge", {
        method: "POST",
      });
      setCaptchaChallenge(challenge);
      setCaptchaX(challenge.tile_x);
      setCaptchaOpen(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "图形验证码加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailCode(captchaToken: string) {
    await requestJSON<void>("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        captcha_token: captchaToken,
      }),
    });
    setStatus("验证码已发送");
  }

  async function handleCaptchaVerify() {
    if (!captchaChallenge) return;

    setLoading(true);
    setStatus(null);
    try {
      const result = await requestJSON<CaptchaVerifyResp>("/api/captcha/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: captchaChallenge.challenge_id,
          x: captchaX,
          y: captchaChallenge.tile_y,
        }),
      });
      await sendEmailCode(result.captcha_token);
      setCaptchaOpen(false);
      setCaptchaChallenge(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "验证失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
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
      setStatus(err instanceof Error ? err.message : "注册失败，请稍后重试");
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

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">创建账号</h2>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0"
          >
            <SvgIcon name="chevron-left" size={9} />
            登录
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">填写信息完成注册</p>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-[10px]">
          <input
            type="email"
            placeholder="邮箱地址"
            autoComplete="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* 验证码行 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="验证码"
              inputMode="numeric"
              maxLength={6}
              className={`${inputCls} flex-1`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button"
              onClick={openCaptcha}
              disabled={loading}
              className="flex-shrink-0 px-[15px] rounded-xl bg-primary/12 border border-primary/25 text-primary text-[12.5px] font-semibold transition-colors hover:bg-primary/20 whitespace-nowrap"
            >
              {loading ? "处理中" : "获取验证码"}
            </button>
          </div>

          {/* 密码 */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="设置密码"
              autoComplete="new-password"
              className={`${inputCls} pr-[46px]`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <input
            type="text"
            placeholder="昵称（可选）"
            autoComplete="nickname"
            className={inputCls}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <input
            type="url"
            placeholder="个人网站（可选）"
            autoComplete="url"
            className={inputCls}
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

        {status && (
          <p role="status" className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            {status}
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

      {/* 协议 */}
      <p className="text-[11.5px] text-muted-foreground mt-[14px] px-[14px] py-[10px] rounded-[10px] bg-primary/[0.06] border border-primary/12 leading-relaxed">
        注册即表示同意《用户协议》和《隐私政策》
      </p>

      {captchaOpen && captchaChallenge && (
        <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/45 px-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="图形验证码"
            className="w-full max-w-[360px] rounded-2xl border border-border bg-card p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-foreground">完成安全验证</h3>
                <p className="mt-1 text-[11.5px] text-muted-foreground">拖动滑块对齐缺口</p>
              </div>
              <button
                type="button"
                aria-label="关闭图形验证码"
                onClick={() => setCaptchaOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <SvgIcon name="close" size={14} />
              </button>
            </div>

            <div
              className="relative mx-auto overflow-hidden rounded-xl border border-border bg-foreground/[0.03]"
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
            </div>

            <label className="sr-only" htmlFor="captcha-slider">
              滑块位置
            </label>
            <input
              id="captcha-slider"
              aria-label="滑块位置"
              type="range"
              min={0}
              max={Math.max(0, captchaChallenge.image_width - captchaChallenge.tile_width)}
              value={captchaX}
              onChange={(e) => setCaptchaX(Number(e.target.value))}
              className="mt-4 w-full accent-primary"
            />

            <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2">
              <button
                type="button"
                onClick={openCaptcha}
                disabled={loading}
                className="rounded-xl border border-border bg-foreground/[0.04] px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/[0.08]"
              >
                换一张
              </button>
              <button
                type="button"
                onClick={handleCaptchaVerify}
                disabled={loading}
                className="rounded-xl border border-primary/25 bg-primary px-3 py-2 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                验证
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
