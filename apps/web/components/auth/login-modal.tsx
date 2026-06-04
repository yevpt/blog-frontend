"use client";

import { useRef, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { LoginView } from "./login-view";
import { RegisterView } from "./register-view";

export function LoginModal() {
  const { isOpen, view, close, setView } = useLoginModal();
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  if (!isOpen) return null;

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const el = modalRef.current;
    if (!el) return;
    el.classList.remove("animate-modal-pulse");
    // reflow 强制重新触发动画
    void el.offsetWidth;
    el.classList.add("animate-modal-pulse");
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      el.addEventListener("animationend", () => el.classList.remove("animate-modal-pulse"), {
        once: true,
      });
    } else {
      // 动画不会播放，立即移除 class 保持状态干净
      el.classList.remove("animate-modal-pulse");
    }
  }

  function handleBack() {
    if (view === "register") {
      setView("login");
    } else {
      close();
    }
  }

  function handleLoginSuccess(user: UserResp) {
    close();
    addToast(`欢迎回来，${user.nickname ?? user.username}`, "success");
    router.refresh();
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[400] flex items-end justify-center md:items-center md:px-4 bg-black/45 backdrop-blur-md"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={view === "login" ? "登录" : "注册"}
        className={cn(
          "relative flex flex-col w-full bg-card border-t border-border shadow-2xl",
          "animate-[slideUpCard_250ms_ease-out]",
          // 移动端：铺满全屏，无圆角
          "max-md:h-dvh max-md:rounded-none max-md:overflow-y-auto max-md:border-x-0 max-md:border-b-0",
          // 桌面端：最大宽度，圆角，最大高度可滚动
          "md:max-w-[400px] md:rounded-2xl md:border md:max-h-[90vh] md:overflow-y-auto",
        )}
      >
        {/* 返回/关闭按钮 — sticky 吸顶，遮住滚动内容 */}
        <div className="sticky top-0 z-10 flex px-8 pt-6 pb-2 bg-card">
          <button
            type="button"
            onClick={handleBack}
            aria-label={view === "register" ? "返回登录视图" : "关闭登录弹窗"}
            className="w-9 h-9 rounded-[11px] bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <SvgIcon name="chevron-left" size={16} />
          </button>
        </div>

        {/* 视图内容 — key 变化时 React 重新挂载触发入场动画 */}
        <div key={view} className="px-8 pb-8 pt-2 animate-view-enter">
          {view === "login" ? (
            <LoginView
              onSwitchToRegister={() => setView("register")}
              onSuccess={handleLoginSuccess}
            />
          ) : (
            <RegisterView onSwitchToLogin={() => setView("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
