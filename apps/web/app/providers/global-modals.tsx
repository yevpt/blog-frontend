"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

export function GlobalModals() {
  return (
    <>
      <LoginModal />
      <ToastRegion queue={toastQueue} />
    </>
  );
}
