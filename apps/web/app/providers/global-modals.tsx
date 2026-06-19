"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { SnippetModal } from "@/components/snippets/snippet-modal";
import { ImageViewerHost } from "@/components/common/image-viewer-host";

export function GlobalModals() {
  return (
    <>
      <LoginModal />
      <SnippetModal />
      <ImageViewerHost />
      <ToastRegion queue={toastQueue} />
    </>
  );
}
