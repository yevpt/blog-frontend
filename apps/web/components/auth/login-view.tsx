"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";

const inputCls =
  "w-full px-4 py-[13px] text-sm rounded-xl bg-foreground/5 border border-border placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.06] transition-colors";

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export function LoginView({ onSwitchToRegister }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">欢迎回来</h2>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0"
          >
            注册
            <SvgIcon name="arrow-up-right" size={10} />
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">请填写以下信息进行登录</p>
      </div>

      {/* 表单字段 + CTA */}
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-[10px]">
          <input
            type="text"
            placeholder="账号 / 邮箱 / 手机号"
            autoComplete="username"
            className={inputCls}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="密码"
              autoComplete="current-password"
              className={`${inputCls} pr-[46px]`}
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
          <div className="text-right">
            <button
              type="button"
              className="text-[11.5px] text-muted-foreground/60 transition-colors hover:text-primary"
            >
              忘记密码？
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="default"
          className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5"
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
      <OAuthGrid />
    </div>
  );
}
