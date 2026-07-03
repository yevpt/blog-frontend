"use client";

import { LoginModal } from "@/components/auth/login-modal";
import { OAuthResultHandler } from "@/components/auth/oauth-result-handler";
import { ToastRegion } from "@repo/ui";
import { toastQueue } from "@/lib/toast";

import { MomentModal } from "@/components/moments/moment-modal";
import { GlobalCommentModal } from "@/components/comments";
import { ImageViewerHost } from "@/components/common/image-viewer-host";
import { NavigationRestoreGuard } from "./navigation-restore-guard";

export function GlobalModals() {
  return (
    <>
      <OAuthResultHandler />
      <NavigationRestoreGuard />
      <LoginModal />
      <MomentModal />
      <GlobalCommentModal />
      <ImageViewerHost />
      <ToastRegion queue={toastQueue} position="top-right" className="top-20" />
    </>
  );
}
