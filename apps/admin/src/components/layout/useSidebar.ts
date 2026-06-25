import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed";
const MOBILE_EXIT_DURATION_MS = 220;

function readStoredCollapsed() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(readStoredCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileVisible, setIsMobileVisible] = useState(false);
  const [isMobileClosing, setIsMobileClosing] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (!isMobileClosing) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setIsMobileVisible(false);
      setIsMobileClosing(false);
    }, MOBILE_EXIT_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [isMobileClosing]);

  function openMobile() {
    setIsMobileVisible(true);
    setIsMobileClosing(false);
    setIsMobileOpen(true);
  }

  function closeMobile() {
    setIsMobileOpen(false);
    setIsMobileClosing(true);
  }

  return {
    isCollapsed,
    isMobileOpen,
    isMobileVisible,
    isMobileClosing,
    collapse: () => setIsCollapsed(true),
    expand: () => setIsCollapsed(false),
    toggleCollapsed: () => setIsCollapsed((current) => !current),
    openMobile,
    closeMobile,
  };
}
