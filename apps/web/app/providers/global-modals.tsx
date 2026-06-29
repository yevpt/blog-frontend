"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { OAuthResultHandler } from "@/components/auth/oauth-result-handler";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { MomentModal } from "@/components/moments/moment-modal";
import { ImageViewerHost } from "@/components/common/image-viewer-host";

export function GlobalModals() {
  return (
    <>
      <OAuthResultHandler />
      <LoginModal />
      <MomentModal />
      <ImageViewerHost />
      <ToastRegion queue={toastQueue} position="top-right" className="top-20" />
    </>
  );
}
