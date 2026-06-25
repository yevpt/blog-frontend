"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountSecurity } from "./use-account-security";
import { SecurityList, type SecurityAction } from "./security-list";
import { UsernameSheet } from "./username-sheet";
import { EmailSheet } from "./email-sheet";
import { PasswordSheet } from "./password-sheet";
import { UnbindConfirm } from "./unbind-confirm";
import { addToast } from "@/lib/toast";
import type { EmailDisplayValue } from "../../_lib/display-email";

interface SecurityTabProps {
  userId: number;
  onDisplayEmailChanged?: (
    display: EmailDisplayValue,
    mainEmail: string | null,
    subEmail: string | null,
  ) => void;
}

export function SecurityTab({ userId, onDisplayEmailChanged }: SecurityTabProps) {
  const { data, loading, error, reload, patchMailShow } = useAccountSecurity();
  const router = useRouter();
  // 当前打开的 Sheet
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<"main" | "sub" | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  // 待解绑平台 source，null 表示确认框关闭
  const [unbindSource, setUnbindSource] = useState<string | null>(null);

  // 发起绑定：取后端授权地址后整页跳转第三方授权页（回跳定位至安全 Tab）。
  // 该 authorize 代理路由不解包，故按信封读 data.authorize_url。
  async function startBind(source: string) {
    const redirectUri = `${window.location.origin}/users/${userId}?tab=security`;
    try {
      const res = await fetch(
        `/api/oauth/${source}/authorize?action=bind&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      const d = await res.json();
      if (d.code === 0 && d.data?.authorize_url) {
        window.location.href = d.data.authorize_url;
        return;
      }
      addToast(d.message ?? "获取授权地址失败", "error");
    } catch {
      addToast("网络异常，请稍后重试", "error");
    }
  }

  function dispatch(action: SecurityAction) {
    if (action.type === "username") {
      setUsernameOpen(true);
      return;
    }
    if (action.type === "email") {
      setEmailTarget(action.target);
      return;
    }
    if (action.type === "password") {
      setPasswordOpen(true);
      return;
    }
    if (action.type === "bind") {
      void startBind(action.source);
      return;
    }
    if (action.type === "unbind") {
      setUnbindSource(action.source);
      return;
    }
    // display 由 SecurityList 内部直接处理，此处无需分支
  }

  // 解绑成功后关闭确认框并刷新数据
  function handleUnbindSuccess() {
    setUnbindSource(null);
    void reload();
  }

  // 邮箱换绑/添加成功后关闭 Sheet 并刷新数据
  function handleEmailSuccess() {
    setEmailTarget(null);
    void reload();
  }

  // 改名成功后登出并刷新（沿用 navbar-user-menu 的登出模式），下次访问需重新登录
  async function handleUsernameSuccess() {
    setUsernameOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，服务端 token 失效后自然拦截
    }
    router.refresh();
  }

  // 改密/设初始/找回成功后同样登出并刷新（密码变更后旧会话失效）
  async function handlePasswordSuccess() {
    setPasswordOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，服务端 token 失效后自然拦截
    }
    router.refresh();
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground/60" aria-busy>
        加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-sm text-muted-foreground">
        <span>{error ?? "加载账号信息失败"}</span>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-md border border-primary/40 px-3 py-1 text-xs text-primary transition-colors hover:border-primary/70"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <>
      <SecurityList
        data={data}
        onAction={dispatch}
        onDisplayChanged={(display) => {
          patchMailShow(display);
          onDisplayEmailChanged?.(display, data.mainEmail, data.subEmail);
        }}
      />
      <UsernameSheet
        open={usernameOpen}
        currentUsername={data.username}
        onClose={() => setUsernameOpen(false)}
        onSuccess={() => void handleUsernameSuccess()}
      />
      <EmailSheet
        open={emailTarget !== null}
        target={emailTarget ?? "main"}
        currentEmail={emailTarget === "sub" ? data.subEmail : data.mainEmail}
        onClose={() => setEmailTarget(null)}
        onSuccess={handleEmailSuccess}
      />
      <PasswordSheet
        open={passwordOpen}
        passwordSet={data.passwordSet}
        mainEmail={data.mainEmail}
        onClose={() => setPasswordOpen(false)}
        onSuccess={() => void handlePasswordSuccess()}
      />
      <UnbindConfirm
        open={unbindSource !== null}
        source={unbindSource ?? ""}
        onClose={() => setUnbindSource(null)}
        onSuccess={handleUnbindSuccess}
      />
    </>
  );
}
