"use client";

import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useHydrated } from "@repo/hooks";
import { formatRelativeTime } from "@/lib/format-time";

interface UserBannerProps {
  lastLoginAt: string | null;
  isOwner: boolean;
  isEditMode: boolean;
}

function getOnlineStatus(lastLoginAt: string | null): { online: boolean; label: string } {
  if (!lastLoginAt) return { online: false, label: "从未登录" };
  const loginTime = new Date(lastLoginAt);
  const diffMs = Date.now() - loginTime.getTime();
  if (diffMs < 3 * 60 * 1000) return { online: true, label: "在线" };
  return { online: false, label: `${formatRelativeTime(loginTime)}来过` };
}

export function UserBanner({ lastLoginAt, isOwner, isEditMode }: UserBannerProps) {
  const hydrated = useHydrated();
  const { online, label } = hydrated
    ? getOnlineStatus(lastLoginAt)
    : { online: false, label: "\u00A0" };

  return (
    <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-violet-800 via-violet-600 to-indigo-500">
      {isOwner && isEditMode && (
        <div className="absolute inset-0 flex cursor-not-allowed items-center justify-center bg-black/30 transition-opacity">
          <span className="flex items-center gap-2 text-sm text-white/80">
            <SvgIcon name="camera" size={16} />
            点击更换背景
          </span>
        </div>
      )}

      {/* 在线状态 */}
      <div
        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-xs text-white backdrop-blur-sm"
        suppressHydrationWarning
      >
        <span className={cn("h-2 w-2 rounded-full", online ? "bg-emerald-400" : "bg-zinc-400")} />
        {label}
      </div>
    </div>
  );
}
