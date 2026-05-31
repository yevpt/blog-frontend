"use client";

import { useState, useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { useLocale } from "@repo/hooks";
import { cn } from "@repo/ui";

export function NavbarMobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocale();

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  // Issue #3：Escape 键关闭抽屉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    // 触发按钮仅在 md 以下显示
    <div className="md:hidden">
      <Button variant="ghost" onPress={open} className="p-2 rounded-md" aria-label="打开导航菜单">
        <SvgIcon name="menu" size={24} className="text-foreground" />
      </Button>

      {/* 遮罩层：始终渲染，通过 opacity + pointer-events 控制，保证淡出动画能执行 */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* 抽屉主体：从左侧滑入；role="dialog" + aria-modal 满足无障碍规范 */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="移动端导航菜单"
        data-open={isOpen}
      >
        {/* 顶部：Logo + 关闭按钮 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <NavbarLogo />
          <Button
            variant="ghost"
            onPress={close}
            className="p-2 rounded-md"
            aria-label="关闭导航菜单"
          >
            <SvgIcon name="close" size={20} className="text-foreground" />
          </Button>
        </div>

        {/* 导航链接列表（竖向排列） */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <NavbarLinks vertical onLinkClick={close} />
        </div>

        {/* 底部：分隔线 + 登录/注册按钮 */}
        <div className="px-4 py-4 border-t border-border flex flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full">
            {t("auth.login")}
          </Button>
          <Button variant="default" size="sm" className="w-full">
            {t("auth.register")}
          </Button>
        </div>
      </div>
    </div>
  );
}
