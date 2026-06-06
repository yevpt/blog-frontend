"use client";

import { usePathname } from "next/navigation";
import { matchNavbarRoute } from "./navbar-route-config";

export const DESKTOP_NAVBAR_SENTINEL_HEIGHT = 24;

export function useNavbarContext() {
  const pathname = usePathname();
  const route = matchNavbarRoute(pathname);

  return {
    pathname,
    title: route.title,
    mobileVariant: route.mobileVariant,
    showHomeBack: route.mobileVariant !== "home",
    showArticleActions: route.mobileVariant === "article",
    desktopCapsuleThreshold: DESKTOP_NAVBAR_SENTINEL_HEIGHT,
  };
}
