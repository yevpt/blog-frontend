"use client";

import { useState, type FormEvent } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { OAuthGrid } from "./oauth-grid";

function inputCls(hasError?: boolean) {
  return cn(
    "w-full px-4 py-[9px] text-sm rounded-xl bg-foreground/5 border placeholder:text-muted-foreground/50 focus:outline-none transition-colors",
    hasError
      ? "border-destructive/50 bg-destructive/[0.03] focus:border-destructive/60"
      : "border-border focus:border-primary/50 focus:bg-primary/[0.06]",
  );
}

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onSuccess: (user: UserResp) => void;
}

export function LoginView({ onSwitchToRegister, onSuccess }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function validateFields(): boolean {
    if (!identifier.trim()) {
      setIdentifierError("请输入账号 / 邮箱 / 手机号");
      return false;
    }
    setIdentifierError(null);
    if (!password) {
      setPasswordError("请输入密码");
      return false;
    }
    setPasswordError(null);
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateFields()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || "登录失败，请稍后重试");
        return;
      }
      if (!json.data?.user) {
        setError("登录失败，请稍后重试");
        return;
      }
      onSuccess(json.data.user as UserResp);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">欢迎回来</h2>
          <Button
            type="button"
            variant="ghost"
            onPress={onSwitchToRegister}
            className="inline-flex items-center cursor-pointer gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0"
          >
            注册
            <SvgIcon name="arrow-up-right" size={10} />
          </Button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">请填写以下信息进行登录</p>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-[14px]">
          <div>
            <input
              type="text"
              placeholder="账号 / 邮箱 / 手机号"
              autoComplete="username"
              className={inputCls(!!identifierError)}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (identifierError) setIdentifierError(null);
              }}
              onBlur={() => {
                if (!identifier.trim()) setIdentifierError("请输入账号 / 邮箱 / 手机号");
              }}
            />
            {identifierError && (
              <p role="alert" className="mt-1.5 text-[11.5px] text-destructive/80 px-1">
                {identifierError}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="密码"
                autoComplete="current-password"
                className={cn(inputCls(!!passwordError), "pr-[46px]")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onBlur={() => {
                  if (!password) setPasswordError("请输入密码");
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onPress={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-lg flex items-center justify-center p-0 cursor-pointer text-muted-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-muted-foreground"
              >
                <SvgIcon name={showPassword ? "eye-off" : "eye"} size={15} />
              </Button>
            </div>
            {passwordError && (
              <p role="alert" className="mt-1.5 text-[11.5px] text-destructive/80 px-1">
                {passwordError}
              </p>
            )}
          </div>

          <div className="text-right">
            <Button
              type="button"
              variant="ghost"
              className="text-[11.5px] text-muted-foreground/60 transition-colors cursor-pointer hover:text-primary"
            >
              忘记密码？
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[12px] leading-relaxed text-destructive/80">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="default"
          className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5"
          isLoading={loading}
          loadingText="登录中…"
        >
          继续
          <SvgIcon name="chevron-right" size={16} />
        </Button>
      </form>

      {/* 分割线 */}
      <div className="flex items-center gap-3 my-[22px] text-[11.5px]">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground flex-shrink-0">其他方式登录</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* OAuth 图标 */}
      <OAuthGrid onSuccess={onSuccess} />
    </div>
  );
}
