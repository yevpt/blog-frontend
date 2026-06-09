"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { SnippetModal } from "@/components/snippets/snippet-modal";

export function GlobalModals() {
  return (
    <>
      <LoginModal />
      <SnippetModal />
      <ToastRegion queue={toastQueue} />
    </>
  );
}
