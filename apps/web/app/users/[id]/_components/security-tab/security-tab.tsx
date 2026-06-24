"use client";

import { useAccountSecurity } from "./use-account-security";
import { SecurityList, type SecurityAction } from "./security-list";

interface SecurityTabProps {
  userId: number;
}

export function SecurityTab({ userId: _userId }: SecurityTabProps) {
  const { data, loading, error, reload } = useAccountSecurity();

  // Task 6–10 接入 Sheet，本任务先占位记录 action 类型
  function dispatch(action: SecurityAction) {
    console.warn("[SecurityTab] action 暂未接入", action);
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

  return <SecurityList data={data} onAction={dispatch} />;
}
