"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { MomentModal } from "@/components/moments/moment-modal";
import { ImageViewerHost } from "@/components/common/image-viewer-host";

export function GlobalModals() {
  return (
    <>
      <LoginModal />
      <MomentModal />
      <ImageViewerHost />
      <ToastRegion queue={toastQueue} />
    </>
  );
}
