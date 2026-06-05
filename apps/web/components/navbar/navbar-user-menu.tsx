"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSnippetModal } from "@/store/use-snippet-modal";

interface NavbarUserMenuProps {
  /** 当前登录用户 ID，用于后续获取 profile */
  userId: number;
  isGlass?: boolean;
}

export function NavbarUserMenu({ isGlass = false }: NavbarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { open: openSnippetModal } = useSnippetModal();

  // TODO(Task 7): 通过 userId 调用 GET /users/me 获取 profile（username、nickname、avatar 等）
  const displayName = "我";

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
      className="animate-dropdown-enter z-[200] min-w-[168px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
    >
      {/* 用户信息头 */}
      <div className="border-b border-border/60 px-3.5 py-2.5">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {displayName}
        </p>
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
          <SvgIcon name="message-circle" size={14} className="shrink-0 text-muted-foreground/60" />
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
          "relative overflow-hidden rounded-full ring-2 ring-transparent transition-shadow",
          "hover:ring-primary/30 focus:outline-none focus:ring-primary/40",
          isGlass && "hover:ring-white/30",
        )}
      >
        <UserAvatar name={displayName} size="md" />
      </button>

      {open && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
