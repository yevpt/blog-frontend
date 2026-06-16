"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { OAuthGrid } from "./oauth-grid";
import { RegisterCaptcha } from "./register-captcha";
import { useRegisterForm } from "@/hooks/use-register-form";

function inputCls(hasError?: boolean) {
  return cn(
    "w-full px-4 py-[9px] text-sm rounded-xl bg-foreground/5 border placeholder:text-muted-foreground/50 focus:outline-none transition-colors",
    hasError
      ? "border-destructive/50 bg-destructive/[0.03] focus:border-destructive/60"
      : "border-border focus:border-primary/50 focus:bg-primary/[0.06]",
  );
}

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export function RegisterView({ onSwitchToLogin }: RegisterViewProps) {
  const {
    showPassword,
    setShowPassword,
    avatarPreview,
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
    setEmailTouched,
    setPasswordTouched,
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
    handleAvatarChange,
    handleAvatarRemove,
  } = useRegisterForm({ onSwitchToLogin });

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-[5px]">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">创建账号</h2>
          <Button
            type="button"
            variant="ghost"
            onPress={onSwitchToLogin}
            className="inline-flex items-center gap-[3px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.07] transition-colors hover:text-primary hover:bg-primary/10 hover:border-primary/25 whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <SvgIcon name="chevron-left" size={9} />
            登录
          </Button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">填写信息完成注册</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-[14px]">
          <div>
            <input
              type="email"
              placeholder="邮箱地址"
              autoComplete="email"
              className={inputCls(!!emailError)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
            {emailError && (
              <p className="mt-1.5 text-[11.5px] text-destructive/80 px-1">{emailError}</p>
            )}
          </div>

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
              <Button
                type="button"
                variant="ghost"
                onPress={openCaptcha}
                isDisabled={!canSendCode}
                isLoading={loading}
                loadingText="处理中"
                className={cn(
                  "absolute right-[5px] top-1/2 -translate-y-1/2",
                  "px-[10px] py-[5px] rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap",
                  canSendCode
                    ? "text-primary hover:bg-primary/10 cursor-pointer"
                    : "text-muted-foreground/40 cursor-not-allowed",
                )}
              >
                {sendBtnLabel}
              </Button>
            </div>
            {codeError && (
              <p className="mt-1.5 text-[11.5px] text-destructive/80 px-1">{codeError}</p>
            )}
          </div>

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
              <Button
                type="button"
                variant="ghost"
                onPress={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-lg flex items-center justify-center p-0 text-muted-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-muted-foreground"
              >
                <SvgIcon name={showPassword ? "eye-off" : "eye"} size={15} />
              </Button>
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
                <Button
                  type="button"
                  variant="ghost"
                  onClickCapture={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleAvatarRemove(fileInputRef.current);
                  }}
                  aria-label="删除头像"
                  className="absolute -top-[5px] -right-[5px] w-[16px] h-[16px] rounded-full bg-destructive flex items-center justify-center p-0 shadow-sm"
                >
                  <SvgIcon name="close" size={8} className="text-white" />
                </Button>
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

        <Button
          type="submit"
          variant="default"
          className="w-full mt-5 h-[46px] rounded-xl text-[14.5px] gap-1.5"
          isLoading={loading}
          loadingText="创建中..."
        >
          创建账号
          <SvgIcon name="chevron-right" size={16} />
        </Button>
      </form>

      <div className="flex items-center gap-3 my-[22px] text-[11.5px]">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground flex-shrink-0">其他方式注册</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <OAuthGrid />

      <RegisterCaptcha
        challenge={captchaChallenge}
        captchaX={captchaX}
        captchaOpen={captchaOpen}
        captchaLoading={captchaLoading}
        onOpenChange={(open) => {
          setCaptchaOpen(open);
          if (!open) {
            closeCaptcha();
          }
        }}
        onCaptchaXChange={setCaptchaX}
        onVerify={handleCaptchaVerify}
        onClose={closeCaptcha}
      />
    </div>
  );
}
