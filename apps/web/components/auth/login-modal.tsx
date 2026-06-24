"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { Button, Modal } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { LoginView } from "./login-view";
import { RegisterView } from "./register-view";

export function LoginModal() {
  const { isOpen, view, close, setView } = useLoginModal();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(isOpen);
  const [isPulsing, setIsPulsing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setModalOpen(true);
      return;
    }
    setModalOpen(false);
  }, [isOpen]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
      if (pulseTimer.current !== null) clearTimeout(pulseTimer.current);
    },
    [],
  );

  function triggerPulse() {
    if (pulseTimer.current !== null) clearTimeout(pulseTimer.current);
    setIsPulsing(true);
    pulseTimer.current = setTimeout(() => setIsPulsing(false), 280);
  }

  function requestClose() {
    setModalOpen(false);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      close();
    }, 200);
  }

  function getDisplayName(user?: UserResp | null): string {
    return user?.nickname ?? user?.username ?? "用户";
  }

  function handleLoginSuccess(user: UserResp) {
    requestClose();
    setTimeout(() => {
      addToast(`登录成功，欢迎回来 ${getDisplayName(user)}！`, "success");
    }, 100);
    router.refresh();
  }

  function handleRegisterSuccess(user: UserResp) {
    requestClose();
    setTimeout(() => {
      addToast(`${getDisplayName(user)}，欢迎你的加入`, "success");
    }, 100);
    router.refresh();
  }

  return (
    <Modal
      isOpen={modalOpen}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      onBackdropPress={triggerPulse}
      placement="fullscreen-mobile"
      size="md"
      aria-label={view === "login" ? "登录" : "注册"}
      overlayClassName="z-[400] bg-black/45 backdrop-blur-md"
      positionerClassName={isPulsing ? "animate-modal-pulse" : ""}
      modalClassName="md:max-w-[480px] max-md:overflow-y-auto md:overflow-y-auto"
    >
      {() => (
        <>
          {/* 关闭按钮 — sticky 吸顶，遮住滚动内容 */}
          <div className="sticky top-0 z-10 flex px-8 pt-6 pb-2 bg-card">
            <Button
              type="button"
              variant="ghost"
              onPress={requestClose}
              aria-label="关闭登录弹窗"
              className="w-9 h-9 rounded-[11px] bg-foreground/5 border border-border flex items-center justify-center p-0 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <SvgIcon name="chevron-left" size={16} />
            </Button>
          </div>

          {/* 视图内容 — key 变化时 React 重新挂载触发入场动画 */}
          <div key={view} className="px-8 pb-8 pt-2 animate-view-enter">
            {view === "login" ? (
              <LoginView
                onSwitchToRegister={() => setView("register")}
                onSuccess={handleLoginSuccess}
              />
            ) : (
              <RegisterView
                onSwitchToLogin={() => setView("login")}
                onSuccess={handleRegisterSuccess}
              />
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
