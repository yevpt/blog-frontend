"use client";

/* global window, HTMLDivElement */
import { useEffect, useRef } from "react";

const NAVBAR_HEIGHT = 88;
const BOTTOM_MARGIN = 16;

/**
 * JS scroll-sync sticky：实现"跟滚到底停住"的侧边栏效果。
 * CSS sticky + overflow 无法同时实现该效果，因此用 JS 手动计算 top 值。
 */
export function useSidebarScroll() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarTopRef = useRef(NAVBAR_HEIGHT);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      const sidebarRect = sidebar.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (delta > 0 && sidebarRect.bottom > viewportHeight) {
        // 向下滚动，sidebar 底部超出视口
        sidebarTopRef.current -= delta;
      } else if (delta < 0 && sidebarRect.top < NAVBAR_HEIGHT) {
        // 向上滚动，sidebar 顶部高于 navbar
        sidebarTopRef.current -= delta;
      }

      // 限制范围
      const minTop = viewportHeight - sidebar.offsetHeight - BOTTOM_MARGIN;
      sidebarTopRef.current = Math.max(minTop, Math.min(NAVBAR_HEIGHT, sidebarTopRef.current));

      sidebar.style.top = `${sidebarTopRef.current}px`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return sidebarRef;
}
