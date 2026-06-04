"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSnippetModal } from "@/store/use-snippet-modal";

interface NavbarUserMenuProps {
  user: UserResp;
  isGlass?: boolean;
}

export function NavbarUserMenu({ user, isGlass = false }: NavbarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { open: openSnippetModal } = useSnippetModal();
  const displayName = user.nickname ?? user.username;

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，服务端 token 过期后自然拦截
    }
    router.refresh();
  }

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`${displayName} 的账号菜单`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative overflow-hidden rounded-full ring-2 ring-transparent transition-shadow",
          "hover:ring-primary/30 focus:outline-none focus:ring-primary/40",
          isGlass && "hover:ring-white/30",
        )}
      >
        <UserAvatar name={displayName} size="md" />
      </button>

      {open && (
        <div className="animate-dropdown-enter absolute right-0 top-[calc(100%+8px)] z-[60] min-w-[168px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* 用户信息头 */}
          <div className="border-b border-border/60 px-3.5 py-2.5">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            {user.email && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">{user.email}</p>
            )}
          </div>
          {/* 菜单项 */}
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <SvgIcon name="user" size={14} className="shrink-0 text-muted-foreground/60" />
              我的账号
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSnippetModal();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <SvgIcon name="plus" size={14} className="shrink-0 text-muted-foreground/60" />
              发表碎语
            </button>
            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <SvgIcon
                name="message-circle"
                size={14}
                className="shrink-0 text-muted-foreground/60"
              />
              消息
            </button>
            <div className="my-1 h-px bg-border/60" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-destructive/80 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
            >
              <SvgIcon name="log-out" size={14} className="shrink-0" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
