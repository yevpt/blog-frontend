"use client";

import Link from "next/link";
import { cn } from "@repo/ui";
import { useMemo } from "react";
import { useHydrated, usePresence } from "@repo/hooks";
import { UserAvatar } from "@/components/common/user-avatar";
import { isAdminUser, isVipUser } from "@/lib/user-roles";
import { userAvatarRoleRingClass } from "@/lib/user-avatar-role-ring";
import {
  resolvePresenceDisplay,
  resolvePresenceFromSubscription,
  toPresenceRecordSeed,
} from "@/lib/user-presence";

/** normal 模式 xl 头像 + ring-2 ring-offset-1 的视觉占位，固定槽位避免角色切换引发布局偏移 */
const NORMAL_AVATAR_SLOT_CLASS = "flex h-14 w-14 shrink-0 items-center justify-center";

export interface BaseUserCardProps {
  user: {
    id: string | number;
    nickname?: string | null;
    avatar_url?: string | null;
    last_login_at?: string | Date | null;
    last_active_at?: string | Date | null;
    is_online?: boolean;
    roles?: string[] | null;
  };
  variant?: "normal" | "compact";
  /** 是否在昵称下显示 Admin/VIP 文字标签；网格场景建议关闭，改由头像外圈标识 */
  showRoleLabel?: boolean;
  animationDelay?: string;
  animateEnter?: boolean;
  className?: string;
  "data-testid"?: string;
  /** 传递至 UserAvatar.defer，虚拟滚动场景设 false 避免重挂闪烁 */
  deferAvatar?: boolean;
  /** 传递至 UserAvatar.loadingEager，虚拟滚动场景设 true 提前加载 */
  loadingEager?: boolean;
  /** 传递至 UserAvatar.priority，首屏 LCP 头像设 true */
  priorityAvatar?: boolean;
  /** 仅展示 SSR/列表自带的在线字段，不订阅实时 presence（网格场景减 CLS） */
  presenceStatic?: boolean;
}

export function BaseUserCard({
  user,
  variant = "normal",
  showRoleLabel = true,
  animationDelay = "0ms",
  animateEnter = false,
  className,
  deferAvatar,
  loadingEager,
  priorityAvatar,
  presenceStatic = false,
  "data-testid": testId,
}: BaseUserCardProps) {
  const hydrated = useHydrated();
  const isAdmin = isAdminUser(user.roles);
  const isVip = isVipUser(user.roles);

  const numericId = typeof user.id === "number" ? user.id : Number(user.id);
  const presenceId = Number.isFinite(numericId) ? numericId : null;
  const fallbackInput = useMemo(
    () => ({
      is_online: user.is_online,
      last_active_at: user.last_active_at,
      last_login_at: user.last_login_at,
    }),
    [user.is_online, user.last_active_at, user.last_login_at],
  );
  const seed = useMemo(() => toPresenceRecordSeed(fallbackInput), [fallbackInput]);
  const { record } = usePresence(presenceStatic ? null : presenceId, seed);

  const presenceInput = presenceStatic
    ? fallbackInput
    : resolvePresenceFromSubscription(record, fallbackInput);
  const presence = hydrated ? resolvePresenceDisplay(presenceInput) : null;

  const roleLabel = isAdmin ? "Admin" : isVip ? "VIP" : null;
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/users/${user.id}`}
      data-testid={testId}
      onTouchStart={() => {}}
      className={cn(
        "flex h-full cursor-pointer select-none flex-col items-center gap-1.5 transition-all duration-200 hover:bg-primary/8 active:scale-95 active:bg-primary/20 active:duration-0",
        isCompact ? "rounded-[10px] p-2" : "rounded-xl p-2.5 gap-2",
        animateEnter && "animate-view-enter",
        className,
      )}
      style={{ animationDelay }}
    >
      {/* 头像 + 正常模式的在线指示；固定槽位预留 ring-offset 空间，普通用户用透明 ring 对齐 */}
      <div className={cn("relative", !isCompact && NORMAL_AVATAR_SLOT_CLASS)}>
        <UserAvatar
          src={user.avatar_url || undefined}
          userId={user.id}
          name={user.nickname || "U"}
          size="xl"
          defer={deferAvatar}
          priority={priorityAvatar}
          loadingEager={loadingEager}
          className={userAvatarRoleRingClass(isAdmin, isVip, !isCompact)}
        />
        {!isCompact && presence?.kind === "online" && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
        )}
      </div>

      {/* 昵称 + 正常模式的角色；shrink-0 防止外层容器高度不足时被 flex 挤压裁切 */}
      <div className="flex w-full shrink-0 flex-col items-center gap-0.5">
        <h3
          className={cn(
            "w-full truncate text-center font-semibold text-foreground",
            isCompact ? "mt-1 text-xs" : "text-sm",
          )}
        >
          {user.nickname || "User"}
        </h3>
        {!isCompact && showRoleLabel && roleLabel && (
          <span
            className={cn(
              "rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
              isAdmin ? "bg-primary/10 text-primary" : "bg-amber-400/10 text-amber-500",
            )}
          >
            {roleLabel}
          </span>
        )}
        {!isCompact && showRoleLabel && !roleLabel && (
          <span className="h-[14px]" aria-hidden="true" />
        )}
      </div>

      {/* 在线状态：固定行高 + 统一 DOM，避免文案长短/在线样式切换引发布局偏移；shrink-0 防止外层容器（如圈子网格固定行高）高度不够时被 flex 挤压——overflow-hidden 元素的自动最小高度会退化为 0，挤压时会整体吃掉高度差导致文字被裁切 */}
      <div className="flex h-4 w-full shrink-0 items-center justify-center overflow-hidden">
        {!hydrated || !presence ? (
          <span
            className="block w-[5.5rem] max-w-full truncate text-center text-[10px] text-(--fg3)"
            aria-hidden="true"
          >
            &nbsp;
          </span>
        ) : (
          <span
            className={cn(
              "block w-[5.5rem] max-w-full truncate text-center text-[10px]",
              presence.kind === "online" ? "font-semibold text-emerald-500" : "text-(--fg3)",
            )}
          >
            {presence.label}
          </span>
        )}
      </div>
    </Link>
  );
}
