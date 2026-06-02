"use client";

import { useState, useEffect } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileMenu } from "./navbar-mobile-menu";

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  const isGlass = scrolled || menuOpen;

  return (
    <nav
      id="navbar"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex justify-center",
        "transition-[padding,background,backdrop-filter] duration-300 ease-out",
        // 桌面端：两侧 padding，胶囊内容居中
        scrolled ? "py-[10px] px-5" : "py-[18px] px-6",
        // 移动端：无 padding，nav 本身承载玻璃背景
        "max-md:p-0",
        isGlass
          ? "max-md:[background:var(--glass-mob)] max-md:backdrop-blur-[20px]"
          : "max-md:bg-transparent",
      )}
    >
      {/* 桌面端胶囊容器 */}
      <div
        className={cn(
          // 移动端：全宽扁平 Header（flex row）
          "max-md:w-full max-md:flex max-md:items-center max-md:justify-between max-md:px-4 max-md:py-3 max-md:rounded-none max-md:border-0 max-md:shadow-none max-md:bg-transparent max-md:backdrop-filter-none",
          // 桌面端：胶囊
          "md:w-full md:max-w-[960px] md:flex md:items-center md:justify-between md:rounded-full md:px-6 md:py-2.5",
          "md:transition-[background,border-color,box-shadow] md:duration-300",
          isGlass
            ? [
                "md:[background:var(--glass-bg)]",
                "md:border md:border-[var(--glass-bdr)]",
                "md:[backdrop-filter:blur(24px)_saturate(180%)]",
                "md:[box-shadow:0_0_0_1px_var(--glass-ring),0_4px_32px_rgba(0,0,0,0.12)]",
              ]
            : "md:bg-transparent md:border md:border-transparent",
        )}
      >
        <NavbarLogo isGlass={isGlass} />

        {/* 中央链接（md+） */}
        <NavbarLinks isGlass={isGlass} />

        {/* 右侧操作区 */}
        <div className="flex items-center gap-1">
          {/* 桌面端动作按钮 */}
          <div className="hidden md:flex">
            <NavbarActions isGlass={isGlass} />
          </div>
          {/* 移动端汉堡菜单（含内联展开） */}
          <NavbarMobileMenu isGlass={isGlass} menuOpen={menuOpen} onMenuToggle={setMenuOpen} />
        </div>
      </div>
    </nav>
  );
}
