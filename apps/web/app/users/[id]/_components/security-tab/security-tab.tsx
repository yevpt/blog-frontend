"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccountSecurity } from "./use-account-security";
import { SecurityList, type SecurityAction } from "./security-list";
import { UsernameSheet } from "./username-sheet";
import { EmailSheet, type EmailSheetIntent } from "./email-sheet";
import { PasswordSheet } from "./password-sheet";
import { UnbindConfirm } from "./unbind-confirm";
import { addToast } from "@/lib/toast";
import { openOAuthPopup } from "@/lib/oauth";
import type { EmailDisplayValue } from "../../_lib/display-email";

interface SecurityTabProps {
  userId: number;
  onDisplayEmailChanged?: (
    display: EmailDisplayValue,
    mainEmail: string | null,
    subEmail: string | null,
    mainEmailVerified: boolean,
    subEmailVerified: boolean,
  ) => void;
}

interface EmailSheetState {
  target: "main" | "sub";
  intent: EmailSheetIntent;
}

export function SecurityTab({ onDisplayEmailChanged }: SecurityTabProps) {
  const { data, loading, error, reload, patchMailShow } = useAccountSecurity();
  const router = useRouter();
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [emailSheet, setEmailSheet] = useState<EmailSheetState | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [unbindSource, setUnbindSource] = useState<string | null>(null);

  // 保存当前 popup 监听器的清理函数，组件卸载时移除，防止内存泄漏
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  // 发起绑定：与登录共用 popup 机制（openOAuthPopup）——弹窗授权、个人详情页保持在原地，
  // 回调页 postMessage 通知本页绑定结果，成功后 reload 列表刷新为已绑定。
  // redirect_uri 用裸回调地址，与各平台注册回调「精确一致」（QQ/微博/百度 等严格校验，
  // 多带 query 会被拒 → 授权失败或 token 交换失败 → 绑定不落库）。
  // 该 authorize 代理路由不解包，故按信封读 data.authorize_url。
  async function startBind(source: string) {
    const redirectUri = `${window.location.origin}/oauth/${source}/callback`;
    try {
      const res = await fetch(
        `/api/oauth/${source}/authorize?action=bind&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      const d = await res.json();
      if (d.code !== 0 || !d.data?.authorize_url) {
        addToast(d.message ?? "获取授权地址失败", "error");
        return;
      }

      cleanupRef.current?.();
      const cleanup = openOAuthPopup(d.data.authorize_url, (msg) => {
        if (msg.type === "oauth_bind_success") {
          addToast("绑定成功", "success");
          void reload();
        } else if (msg.type === "oauth_error") {
          addToast(msg.message ?? "绑定失败，请稍后重试", "error");
        }
        // 忽略 oauth_success（登录消息）等无关类型
        cleanupRef.current = null;
      });

      if (!cleanup) {
        addToast("浏览器阻止了弹出窗口，请允许后重试", "error");
        return;
      }
      cleanupRef.current = cleanup;
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
      setEmailSheet({ target: action.target, intent: action.intent });
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
    }
  }

  function handleUnbindSuccess() {
    setUnbindSource(null);
    void reload();
  }

  function handleEmailSuccess() {
    setEmailSheet(null);
    void reload();
  }

  async function handleUsernameSuccess() {
    setUsernameOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.refresh();
  }

  async function handlePasswordSuccess() {
    setPasswordOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
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

  const emailTarget = emailSheet?.target ?? "main";
  const currentEmail = emailTarget === "sub" ? data.subEmail : data.mainEmail;

  return (
    <>
      <SecurityList
        data={data}
        onAction={dispatch}
        onDisplayChanged={(display) => {
          patchMailShow(display);
          onDisplayEmailChanged?.(
            display,
            data.mainEmail,
            data.subEmail,
            data.mainEmailVerified,
            data.subEmailVerified,
          );
        }}
      />
      <UsernameSheet
        open={usernameOpen}
        currentUsername={data.username}
        onClose={() => setUsernameOpen(false)}
        onSuccess={() => void handleUsernameSuccess()}
      />
      <EmailSheet
        open={emailSheet !== null}
        target={emailTarget}
        intent={emailSheet?.intent ?? "bind"}
        currentEmail={currentEmail}
        onClose={() => setEmailSheet(null)}
        onSuccess={handleEmailSuccess}
      />
      <PasswordSheet
        open={passwordOpen}
        passwordSet={data.passwordSet}
        mainEmail={data.mainEmail}
        mainEmailVerified={data.mainEmailVerified}
        onVerifyMainEmail={() => setEmailSheet({ target: "main", intent: "verify" })}
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
