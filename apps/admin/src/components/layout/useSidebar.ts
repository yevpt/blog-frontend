import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed";

function readStoredCollapsed() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(readStoredCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return {
    isCollapsed,
    isMobileOpen,
    collapse: () => setIsCollapsed(true),
    expand: () => setIsCollapsed(false),
    toggleCollapsed: () => setIsCollapsed((current) => !current),
    openMobile: () => setIsMobileOpen(true),
    closeMobile: () => setIsMobileOpen(false),
  };
}
