"use client";

import { useState, type ChangeEvent } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";

const inputCls =
  "w-full px-4 py-[13px] text-sm rounded-xl bg-foreground/5 border border-border placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.06] transition-colors";

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export function RegisterView({ onSwitchToLogin }: RegisterViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
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
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-[10px]">
          <input type="email" placeholder="邮箱地址" autoComplete="email" className={inputCls} />

          {/* 验证码行 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="验证码"
              inputMode="numeric"
              maxLength={6}
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              className="flex-shrink-0 px-[15px] rounded-xl bg-primary/12 border border-primary/25 text-primary text-[12.5px] font-semibold transition-colors hover:bg-primary/20 whitespace-nowrap"
            >
              获取验证码
            </button>
          </div>

          {/* 密码 */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="设置密码"
              autoComplete="new-password"
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

          <input
            type="text"
            placeholder="昵称（可选）"
            autoComplete="nickname"
            className={inputCls}
          />

          <input
            type="url"
            placeholder="个人网站（可选）"
            autoComplete="url"
            className={inputCls}
          />

          {/* 头像上传 */}
          <label className="flex items-center gap-[14px] p-[12px_16px] rounded-xl bg-foreground/[0.03] border-[1.5px] border-dashed border-foreground/[0.09] cursor-pointer transition-colors hover:bg-primary/5 hover:border-primary/25">
            <div className="w-[38px] h-[38px] rounded-full bg-primary/12 border-[1.5px] border-dashed border-primary/25 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="头像预览"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <SvgIcon name="user" size={16} className="text-primary/60" />
              )}
            </div>
            <div>
              <div className="text-[13px] text-muted-foreground">上传头像</div>
              <div className="text-[11px] text-muted-foreground/40 mt-[2px]">
                可选 · JPG / PNG，最大 2MB
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        {/* 创建账号按钮 */}
        <Button
          type="submit"
          variant="default"
          className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5"
        >
          立即注册
          <SvgIcon name="chevron-right" size={16} />
        </Button>
      </form>

      {/* 协议 */}
      <p className="text-[11.5px] text-muted-foreground mt-[14px] px-[14px] py-[10px] rounded-[10px] bg-primary/[0.06] border border-primary/12 leading-relaxed">
        注册即表示同意《用户协议》和《隐私政策》
      </p>

      {/* 分割线 */}
      <div className="flex items-center gap-3 my-[22px] text-[11.5px]">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground flex-shrink-0">其他方式注册</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* OAuth 图标 */}
      <OAuthGrid />
    </div>
  );
}
