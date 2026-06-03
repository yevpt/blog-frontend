"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useLoginModal } from "@/store/use-login-modal";

export function LoginModal() {
  const { isOpen, close } = useLoginModal();
  if (!isOpen) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/45 backdrop-blur-md"
      onClick={(event) => {
        if (event.currentTarget === event.target) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="登录"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">登录</h2>
          <Button
            variant="ghost"
            onPress={close}
            aria-label="关闭登录弹窗"
            className="h-7 w-7 rounded-lg bg-border p-0"
          >
            <SvgIcon name="close" size={16} />
          </Button>
        </div>
        <p className="text-sm text-[var(--fg2)]">登录功能即将上线，敬请期待。</p>
      </div>
    </div>
  );
}
