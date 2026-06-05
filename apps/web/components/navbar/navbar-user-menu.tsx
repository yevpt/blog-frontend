"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { useSession } from "@/app/providers/session-provider";

interface NavbarUserMenuProps {
  isGlass?: boolean;
  unreadCount?: number;
}

export function NavbarUserMenu({ isGlass = false, unreadCount = 0 }: NavbarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { open: openSnippetModal } = useSnippetModal();
  const { profile } = useSession();

  const displayName = profile?.nickname ?? profile?.username ?? "";

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    function handleBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }

    if (mediaQuery.matches) setOpen(false);

    mediaQuery.addEventListener("change", handleBreakpointChange);
    return () => mediaQuery.removeEventListener("change", handleBreakpointChange);
  }, []);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  }

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

  const dropdown = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="animate-dropdown-enter z-[200] min-w-[190px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
    >
      {/* 昵称行：点击跳主页/设置 */}
      <div className="px-1.5 pt-1.5 pb-1">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-primary/[0.07] px-3 py-2 text-left transition-colors hover:bg-primary/[0.10]"
        >
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold leading-tight text-foreground">
              {displayName || "我的账号"}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-primary/70">管理账号 →</span>
          </span>
          <SvgIcon
            name="chevron-right"
            size={13}
            className="shrink-0 text-[var(--fg3)] opacity-50"
          />
        </button>
      </div>

      {/* 功能区 */}
      <div className="flex flex-col gap-0.5 border-t border-border/60 px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openSnippetModal();
          }}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <SvgIcon name="plus" size={14} className="shrink-0 text-muted-foreground/60" />
          发表碎语
        </button>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <SvgIcon name="bell" size={14} className="shrink-0 text-muted-foreground/60" />
          <span className="flex-1">我的消息</span>
          {unreadCount > 0 && (
            <span
              data-testid="unread-badge"
              className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 退出区（G2：普通分割线隔离） */}
      <div className="border-t border-border/60 px-1.5 pb-1.5 pt-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-destructive/80 transition-colors hover:bg-destructive/[0.07] hover:text-destructive"
        >
          <SvgIcon name="log-out" size={14} className="shrink-0 text-destructive/80" />
          退出登录
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${displayName} 的账号菜单`}
        aria-expanded={open}
        onClick={handleToggle}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-full ring-2 ring-transparent transition-shadow",
          "hover:ring-primary/30 focus:outline-none focus:ring-primary/40",
          isGlass && "hover:ring-white/30",
        )}
      >
        <UserAvatar src={profile?.avatar_url ?? undefined} name={displayName || "?"} size="md" />
      </button>

      {open && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
