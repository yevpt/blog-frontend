"use client";

import { useState, useEffect } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileDrawer } from "./navbar-mobile-drawer";

export function SiteNavbar() {
  // 入场动效：挂载后从 translate-y-[-100%] opacity-0 过渡到正常状态
  const [mounted, setMounted] = useState(false);
  // 滚动缩小效果：scrollY > 10 时切换到紧凑样式
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "transition-all duration-300",
        // 入场动效
        mounted ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        "transition-transform transition-opacity duration-500 ease-out",
        // 滚动后添加毛玻璃背景和边框
        scrolled ? "py-2 backdrop-blur-md bg-background/80 border-b border-border" : "py-4",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* 左侧：Logo */}
          <NavbarLogo />

          {/* 中间（md+）：导航链接 */}
          <NavbarLinks />

          {/* 右侧：主题切换 + 登录/注册 + 移动端抽屉触发按钮 */}
          <div className="flex items-center gap-1">
            <NavbarActions />
            <NavbarMobileDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
