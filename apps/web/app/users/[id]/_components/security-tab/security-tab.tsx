"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountSecurity } from "./use-account-security";
import { SecurityList, type SecurityAction } from "./security-list";
import { UsernameSheet } from "./username-sheet";
import { EmailSheet } from "./email-sheet";

interface SecurityTabProps {
  userId: number;
}

export function SecurityTab({ userId: _userId }: SecurityTabProps) {
  const { data, loading, error, reload } = useAccountSecurity();
  const router = useRouter();
  // 当前打开的 Sheet；username / email 已接入，其余 action 仍占位
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<"main" | "sub" | null>(null);

  function dispatch(action: SecurityAction) {
    if (action.type === "username") {
      setUsernameOpen(true);
      return;
    }
    if (action.type === "email") {
      setEmailTarget(action.target);
      return;
    }
    // Task 8–10 接入其余 Sheet，暂占位记录
    console.warn("[SecurityTab] action 暂未接入", action);
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
      <SecurityList data={data} onAction={dispatch} />
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
    </>
  );
}
