"use client";

import type { ReactNode } from "react";
import type { SecurityData } from "./use-account-security";
import { getProviderMeta } from "./oauth-providers";

/** 列表行可触发的动作，可辨识联合。后续 Task 6–10 据 type 打开对应 Sheet。 */
export type SecurityAction =
  | { type: "username" }
  | { type: "password" }
  | { type: "email"; target: "main" | "sub" }
  | { type: "bind"; source: string }
  | { type: "unbind"; source: string }
  | { type: "display"; value: "main" | "sub" | "none" };

interface SecurityListProps {
  data: SecurityData;
  onAction: (action: SecurityAction) => void;
}

/** mailShow 数值 → 对外展示文案。约定 0=不展示, 1=主邮箱, 2=副邮箱（Task 8 落地交互下拉前先只读展示）。 */
const MAIL_SHOW_LABEL: Record<number, string> = {
  0: "不展示",
  1: "主邮箱",
  2: "副邮箱",
};

/** 账号安全受控纯展示列表：三组（登录凭证 / 邮箱 / 第三方绑定） */
export function SecurityList({ data, onAction }: SecurityListProps) {
  return (
    <div className="pb-4">
      <SecuritySection title="登录凭证">
        <SecurityItem
          label="用户名"
          value={data.username}
          action="修改"
          actionLabel="修改用户名"
          onAction={() => onAction({ type: "username" })}
        />
        <SecurityItem
          label="登录密码"
          badge={data.passwordSet ? "已设置" : "未设置"}
          badgeVariant={data.passwordSet ? "bound" : "unbound"}
          action={data.passwordSet ? "修改" : "设置"}
          actionLabel={data.passwordSet ? "修改密码" : "设置"}
          onAction={() => onAction({ type: "password" })}
        />
      </SecuritySection>

      <SecuritySection title="邮箱" className="mt-2">
        <SecurityItem
          label="主邮箱"
          labelSub="接收通知"
          value={data.mainEmail ?? "未绑定"}
          valueMuted={!data.mainEmail}
          action={data.mainEmail ? "换绑" : "绑定"}
          actionLabel={data.mainEmail ? "换绑主邮箱" : "绑定主邮箱"}
          onAction={() => onAction({ type: "email", target: "main" })}
        />
        <SecurityItem
          label="副邮箱"
          value={data.subEmail ?? "未绑定"}
          valueMuted={!data.subEmail}
          action={data.subEmail ? "换绑" : "绑定"}
          actionLabel={data.subEmail ? "换绑副邮箱" : "绑定副邮箱"}
          onAction={() => onAction({ type: "email", target: "sub" })}
        />
        {/* 对外展示行本任务先渲染为只读文本；Task 8 再替换为交互下拉。 */}
        <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
          <span className="flex-1 text-[13px] text-muted-foreground">对外展示邮箱</span>
          <span className="text-[13px] text-muted-foreground/70">
            {MAIL_SHOW_LABEL[data.mailShow] ?? "不展示"}
          </span>
        </div>
      </SecuritySection>

      <SecuritySection title="第三方绑定" className="mt-2">
        {data.providers.map(({ source, bound }) => {
          const meta = getProviderMeta(source);
          return (
            <SecurityItem
              key={source}
              labelNode={
                <span className="flex items-center gap-2">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden
                  >
                    {meta.short}
                  </span>
                  {meta.label}
                </span>
              }
              badge={bound ? "已绑定" : "未绑定"}
              badgeVariant={bound ? "bound" : "unbound"}
              action={bound ? "解绑" : "绑定"}
              actionMuted={bound}
              actionLabel={bound ? `解绑 ${meta.label}` : `绑定 ${meta.label}`}
              onAction={() =>
                onAction(bound ? { type: "unbind", source } : { type: "bind", source })
              }
            />
          );
        })}
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
  label?: string;
  /** 自定义标签节点（第三方行用，含短码方块）；优先级高于 label */
  labelNode?: ReactNode;
  labelSub?: string;
  value?: string;
  valueMuted?: boolean;
  badge?: string;
  badgeVariant?: "bound" | "unbound";
  action?: string;
  /** 按钮无障碍名称，用于区分多行同文案按钮（如多个「绑定」） */
  actionLabel?: string;
  actionMuted?: boolean;
  onAction?: () => void;
}

function SecurityItem({
  label,
  labelNode,
  labelSub,
  value,
  valueMuted,
  badge,
  badgeVariant,
  action,
  actionLabel,
  actionMuted,
  onAction,
}: SecurityItemProps) {
  return (
    <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
      <span className="flex-1 text-[13px] text-muted-foreground">
        {labelNode ?? label}
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
            aria-label={actionLabel ?? action}
            onClick={onAction}
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
