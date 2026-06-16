"use client";

import type { ReactNode } from "react";

interface SecurityTabProps {
  userId: number;
}

export function SecurityTab({ userId: _userId }: SecurityTabProps) {
  return (
    <div className="pb-4">
      <SecuritySection title="登录凭证">
        <SecurityItem label="用户名" value="（已设置）" action="修改" />
        <SecurityItem label="登录密码" value="已设置" action="修改" />
      </SecuritySection>

      <SecuritySection title="邮箱" className="mt-2">
        <SecurityItem label="主邮箱" labelSub="接收通知" value="（已绑定）" action="修改" />
        <SecurityItem label="副邮箱" value="未设置" valueMuted action="添加" />
        <div className="flex items-center px-4 py-3 text-sm text-muted-foreground">
          <span className="shrink-0">对外展示邮箱</span>
          <div className="ml-auto">
            <select className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none">
              <option>主邮箱</option>
              <option>副邮箱</option>
              <option>不展示</option>
            </select>
          </div>
        </div>
      </SecuritySection>

      <SecuritySection title="第三方绑定" className="mt-2">
        <SecurityItem
          label="Google"
          badge="已绑定"
          badgeVariant="bound"
          action="解绑"
          actionMuted
        />
        <SecurityItem label="Github OAuth" badge="未绑定" badgeVariant="unbound" action="绑定" />
        <SecurityItem label="QQ" badge="未绑定" badgeVariant="unbound" action="绑定" />
      </SecuritySection>
    </div>
  );
}

function SecuritySection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="px-4 pb-1 pt-4 text-xs font-semibold text-muted-foreground/60">{title}</h3>
      <div className="border-t border-border">{children}</div>
    </div>
  );
}

interface SecurityItemProps {
  label: string;
  labelSub?: string;
  value?: string;
  valueMuted?: boolean;
  badge?: string;
  badgeVariant?: "bound" | "unbound";
  action?: string;
  actionMuted?: boolean;
}

function SecurityItem({
  label,
  labelSub,
  value,
  valueMuted,
  badge,
  badgeVariant,
  action,
  actionMuted,
}: SecurityItemProps) {
  return (
    <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
      <span className="flex-1 text-[13px] text-muted-foreground">
        {label}
        {labelSub && (
          <span className="ml-1.5 text-xs text-muted-foreground/50">（{labelSub}）</span>
        )}
      </span>

      <div className="flex items-center gap-2">
        {value && (
          <span
            className={`text-[13px] ${valueMuted ? "italic text-muted-foreground/40" : "text-muted-foreground/70"}`}
          >
            {value}
          </span>
        )}

        {badge && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              badgeVariant === "bound"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-muted text-muted-foreground/60"
            }`}
          >
            {badge}
          </span>
        )}

        {action && (
          <button
            type="button"
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              actionMuted
                ? "border-border text-muted-foreground/60 hover:text-muted-foreground"
                : "border-primary/40 text-primary hover:border-primary/70"
            }`}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
