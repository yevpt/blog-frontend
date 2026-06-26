"use client";

import type { ReactNode } from "react";
import { Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { SecurityData } from "./use-account-security";
import { getProviderMeta } from "./oauth-providers";
import { EmailDisplaySelect, type EmailDisplayValue } from "./email-display-select";
import { mailShowToDisplay } from "../../_lib/display-email";

/** 列表行可触发的动作 */
export type SecurityAction =
  | { type: "username" }
  | { type: "password" }
  | { type: "email"; target: "main" | "sub"; intent: "bind" | "rebind" | "verify" }
  | { type: "bind"; source: string }
  | { type: "unbind"; source: string }
  | { type: "display"; value: "main" | "sub" | "none" };

interface SecurityListProps {
  data: SecurityData;
  onAction: (action: SecurityAction) => void;
  /** 对外展示设置变更成功后回调，用于局部更新 mailShow */
  onDisplayChanged: (display: EmailDisplayValue) => void;
}

function emailRowProps(
  email: string | null,
  verified: boolean,
  bindLabel: string,
  rebindLabel: string,
  target: "main" | "sub",
  onAction: (action: SecurityAction) => void,
) {
  if (!email) {
    return {
      value: "未绑定" as const,
      valueMuted: true,
      badge: undefined,
      action: "绑定" as const,
      actionLabel: bindLabel,
      onAction: () => onAction({ type: "email", target, intent: "bind" }),
      secondaryAction: undefined,
      secondaryActionLabel: undefined,
      onSecondaryAction: undefined,
    };
  }

  return {
    value: email,
    valueMuted: false,
    badge: verified ? undefined : ("未验证" as const),
    badgeVariant: "unbound" as const,
    action: "换绑" as const,
    actionLabel: rebindLabel,
    onAction: () => onAction({ type: "email", target, intent: "rebind" }),
    secondaryAction: verified ? undefined : ("验证当前邮箱" as const),
    secondaryActionLabel: verified ? undefined : `验证${target === "main" ? "主" : "副"}邮箱`,
    onSecondaryAction: verified
      ? undefined
      : () => onAction({ type: "email", target, intent: "verify" }),
  };
}

/** 账号安全受控纯展示列表：三组（登录凭证 / 邮箱 / 第三方绑定） */
export function SecurityList({ data, onAction, onDisplayChanged }: SecurityListProps) {
  const mainRow = emailRowProps(
    data.mainEmail,
    data.mainEmailVerified,
    "绑定主邮箱",
    "换绑主邮箱",
    "main",
    onAction,
  );
  const subRow = emailRowProps(
    data.subEmail,
    data.subEmailVerified,
    "绑定副邮箱",
    "换绑副邮箱",
    "sub",
    onAction,
  );

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
        <MainEmailSecurityItem
          label="主邮箱"
          labelSub="接收通知"
          value={mainRow.value}
          valueMuted={mainRow.valueMuted}
          badge={mainRow.badge}
          badgeVariant={mainRow.badgeVariant}
          action={mainRow.action}
          actionLabel={mainRow.actionLabel}
          onAction={mainRow.onAction}
          secondaryAction={mainRow.secondaryAction}
          secondaryActionLabel={mainRow.secondaryActionLabel}
          onSecondaryAction={mainRow.onSecondaryAction}
        />
        <SecurityItem
          label="副邮箱"
          value={subRow.value}
          valueMuted={subRow.valueMuted}
          badge={subRow.badge}
          badgeVariant={subRow.badgeVariant}
          action={subRow.action}
          actionLabel={subRow.actionLabel}
          onAction={subRow.onAction}
          secondaryAction={subRow.secondaryAction}
          secondaryActionLabel={subRow.secondaryActionLabel}
          onSecondaryAction={subRow.onSecondaryAction}
        />
        <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
          <span className="flex-1 text-[13px] text-muted-foreground">对外展示邮箱</span>
          <EmailDisplaySelect
            value={mailShowToDisplay(data.mailShow)}
            mainEmailVerified={data.mainEmailVerified}
            subEmailVerified={data.subEmailVerified}
            onChanged={onDisplayChanged}
          />
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
                  {meta.icon ? (
                    <SvgIcon name={meta.icon} size={20} aria-hidden />
                  ) : (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden
                    >
                      {meta.short}
                    </span>
                  )}
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
  labelNode?: ReactNode;
  labelSub?: string;
  value?: string;
  valueMuted?: boolean;
  badge?: string;
  badgeVariant?: "bound" | "unbound";
  action?: string;
  actionLabel?: string;
  actionMuted?: boolean;
  onAction?: () => void;
  secondaryAction?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
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
  secondaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: SecurityItemProps) {
  return (
    <div className="flex min-h-[48px] items-center border-b border-border px-4 py-2 last:border-b-0">
      <span className="flex-1 text-[13px] text-muted-foreground">
        {labelNode ?? label}
        {labelSub && (
          <span className="ml-1.5 text-xs text-muted-foreground/50">（{labelSub}）</span>
        )}
      </span>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {value && (
          <span
            className={`max-w-[40vw] truncate text-[13px] sm:max-w-none ${
              valueMuted ? "italic text-muted-foreground/40" : "text-muted-foreground/70"
            }`}
          >
            {value}
          </span>
        )}

        {badge && (
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
              badgeVariant === "bound"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-muted text-muted-foreground/60"
            }`}
          >
            {badge}
          </span>
        )}

        {secondaryAction && (
          <Button
            variant="outline"
            size="sm"
            aria-label={secondaryActionLabel ?? secondaryAction}
            onPress={onSecondaryAction}
            className="border-primary/40 text-primary hover:border-primary/70 hover:text-primary"
          >
            {secondaryAction}
          </Button>
        )}

        {action && (
          <Button
            variant="outline"
            size="sm"
            aria-label={actionLabel ?? action}
            onPress={onAction}
            className={
              actionMuted
                ? "text-muted-foreground/70 hover:text-muted-foreground"
                : "border-primary/40 text-primary hover:border-primary/70 hover:text-primary"
            }
          >
            {action}
          </Button>
        )}
      </div>
    </div>
  );
}

/** 主邮箱行：移动端三行（标签 / 邮箱+状态 / 按钮），PC 端与其他行一致 */
function MainEmailSecurityItem({
  label,
  labelSub,
  value,
  valueMuted,
  badge,
  badgeVariant,
  action,
  actionLabel,
  onAction,
  secondaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: Omit<SecurityItemProps, "labelNode" | "actionMuted">) {
  const valueNode = value ? (
    <span
      className={`truncate text-[13px] max-sm:max-w-full sm:max-w-none ${
        valueMuted ? "italic text-muted-foreground/40" : "text-muted-foreground/70"
      }`}
    >
      {value}
    </span>
  ) : null;

  const badgeNode = badge ? (
    <span
      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
        badgeVariant === "bound"
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-muted text-muted-foreground/60"
      }`}
    >
      {badge}
    </span>
  ) : null;

  const secondaryActionNode = secondaryAction ? (
    <Button
      variant="outline"
      size="sm"
      aria-label={secondaryActionLabel ?? secondaryAction}
      onPress={onSecondaryAction}
      className="border-primary/40 text-primary hover:border-primary/70 hover:text-primary"
    >
      {secondaryAction}
    </Button>
  ) : null;

  const actionNode = action ? (
    <Button
      variant="outline"
      size="sm"
      aria-label={actionLabel ?? action}
      onPress={onAction}
      className="border-primary/40 text-primary hover:border-primary/70 hover:text-primary"
    >
      {action}
    </Button>
  ) : null;

  const hasMetaRow = valueNode || badgeNode;
  const hasActionRow = secondaryActionNode || actionNode;

  return (
    <div className="grid grid-cols-1 gap-y-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex sm:min-h-[48px] sm:items-center sm:gap-2 sm:py-2">
      <span className="text-[13px] text-muted-foreground sm:flex-1">
        {label}
        {labelSub && (
          <span className="ml-1.5 text-xs text-muted-foreground/50">（{labelSub}）</span>
        )}
      </span>

      {hasMetaRow && (
        <div className="flex flex-wrap items-center gap-2 sm:contents">
          {valueNode}
          {badgeNode}
        </div>
      )}

      {hasActionRow && (
        <div className="flex flex-wrap items-center gap-2 sm:contents">
          {secondaryActionNode}
          {actionNode}
        </div>
      )}
    </div>
  );
}
