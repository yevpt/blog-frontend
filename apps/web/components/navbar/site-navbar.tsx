"use client";

import { useState, useEffect } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileDrawer } from "./navbar-mobile-drawer";

export function SiteNavbar() {
  // 滚动缩小效果：scrollY > 10 时切换到紧凑样式
  const [scrolled, setScrolled] = useState(false);

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
        "transition-[padding,background-color,backdrop-filter,border-color] duration-300 ease-out",
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
