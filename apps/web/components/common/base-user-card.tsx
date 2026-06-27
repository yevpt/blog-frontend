"use client";

import Link from "next/link";
import { cn } from "@repo/ui";
import { useMemo } from "react";
import { useHydrated, usePresence } from "@repo/hooks";
import { UserAvatar } from "@/components/common/user-avatar";
import { isAdminUser, isVipUser } from "@/lib/user-roles";
import {
  resolvePresenceDisplay,
  resolvePresenceFromSubscription,
  toPresenceRecordSeed,
} from "@/lib/user-presence";

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
  /** 是否在昵称下显示 Admin/VIP 文字标签；网格场景建议关闭，改由头像标识 */
  showRoleLabel?: boolean;
  animationDelay?: string;
  animateEnter?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function BaseUserCard({
  user,
  variant = "normal",
  showRoleLabel = true,
  animationDelay = "0ms",
  animateEnter = false,
  className,
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
  const { record } = usePresence(presenceId, seed);

  const presence = hydrated
    ? resolvePresenceDisplay(resolvePresenceFromSubscription(record, fallbackInput))
    : null;

  const roleLabel = isAdmin ? "Admin" : isVip ? "VIP" : null;
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/users/${user.id}`}
      data-testid={testId}
      onTouchStart={() => {}}
      className={cn(
        "flex h-full cursor-pointer select-none flex-col items-center gap-1.5 transition-all duration-200 hover:bg-primary/8 active:scale-95 active:bg-primary/20 active:duration-0",
        isCompact ? "rounded-[10px] p-2" : "rounded-xl p-2.5 md:gap-2 md:p-3",
        animateEnter && "animate-view-enter",
        className,
      )}
      style={{ animationDelay }}
    >
      {/* 头像 + 正常模式的在线指示 */}
      <div className="relative">
        <UserAvatar
          src={user.avatar_url || undefined}
          name={user.nickname || "U"}
          size="xl"
          isVip={isVip}
          className={cn(
            !isCompact && "md:h-16 md:w-16",
            !isCompact && isAdmin
              ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-background"
              : !isCompact && isVip
                ? "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-background"
                : "",
          )}
        />
        {!isCompact && presence?.kind === "online" && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
        )}
      </div>

      {/* 昵称 + 正常模式的角色 */}
      <div className="flex w-full flex-col items-center gap-0.5">
        <h3
          className={cn(
            "w-full truncate text-center font-semibold text-foreground",
            isCompact ? "mt-1 text-xs" : "text-xs md:text-sm",
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

      {/* 在线状态：hydration 前占位，避免在线/离线分支切换导致 #418 */}
      <div className="flex w-full items-center justify-center">
        {!hydrated || !presence ? (
          <span className="truncate text-[10px] text-(--fg3)">&nbsp;</span>
        ) : presence.kind === "online" ? (
          <span className="flex items-center gap-1 truncate text-[10px] font-semibold text-emerald-500">
            {isCompact && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
            {presence.label}
          </span>
        ) : (
          <span className="truncate text-[10px] text-(--fg3)">{presence.label}</span>
        )}
      </div>
    </Link>
  );
}
