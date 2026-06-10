"use client";

import { useRef, useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { LoginView } from "./login-view";
import { RegisterView } from "./register-view";

type Phase = "entering" | "idle" | "pulsing" | "leaving";

export function LoginModal() {
  const { isOpen, view, close, setView } = useLoginModal();
  const router = useRouter();

  const [rendered, setRendered] = useState(isOpen);
  const [phase, setPhase] = useState<Phase>(isOpen ? "entering" : "idle");
  const phaseRef = useRef<Phase>(isOpen ? "entering" : "idle");
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setPhaseSync(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function clearPhaseTimer() {
    if (phaseTimer.current !== null) {
      clearTimeout(phaseTimer.current);
      phaseTimer.current = null;
    }
  }

  useEffect(() => {
    if (isOpen) {
      clearPhaseTimer();
      setRendered(true);
      setPhaseSync("entering");
      phaseTimer.current = setTimeout(() => setPhaseSync("idle"), 280);
    }
    return clearPhaseTimer;
  }, [isOpen]);

  if (!rendered) return null;

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (phaseRef.current === "leaving") return;
    clearPhaseTimer();
    setPhaseSync("pulsing");
    phaseTimer.current = setTimeout(() => setPhaseSync("idle"), 280);
  }

  function requestClose() {
    if (phaseRef.current === "leaving") return;
    clearPhaseTimer();
    setPhaseSync("leaving");
    phaseTimer.current = setTimeout(() => {
      setRendered(false);
      setPhaseSync("idle");
      close();
    }, 220);
  }

  function handleLoginSuccess(user: UserResp) {
    requestClose();
    setTimeout(() => {
      addToast(`登录成功，欢迎回来 ${user.nickname ?? user.username}！`, "success");
    }, 100);
    router.refresh();
  }

  const animClass =
    phase === "entering"
      ? "animate-modal-enter"
      : phase === "leaving"
        ? "animate-modal-leave"
        : phase === "pulsing"
          ? "animate-modal-pulse"
          : "";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[400] flex items-end justify-center md:items-center md:px-4 bg-black/45 backdrop-blur-md"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={view === "login" ? "登录" : "注册"}
        className={cn(
          "relative flex flex-col w-full bg-card border-t border-border shadow-2xl",
          animClass,
          // 移动端：铺满全屏，无圆角
          "max-md:h-dvh max-md:rounded-none max-md:overflow-y-auto max-md:border-x-0 max-md:border-b-0",
          // 桌面端：最大宽度，圆角，最大高度可滚动
          "md:max-w-[480px] md:rounded-2xl md:border md:max-h-[90vh] md:overflow-y-auto",
        )}
      >
        {/* 关闭按钮 — sticky 吸顶，遮住滚动内容 */}
        <div className="sticky top-0 z-10 flex px-8 pt-6 pb-2 bg-card">
          <button
            type="button"
            onClick={requestClose}
            aria-label="关闭登录弹窗"
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
