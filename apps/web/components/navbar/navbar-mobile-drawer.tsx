"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { useLocale } from "@repo/hooks/locale";
import { cn } from "@repo/ui";

export function NavbarMobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocale();

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    // 触发按钮仅在 md 以下显示
    <div className="md:hidden">
      <Button variant="ghost" onClick={open} className="p-2 rounded-md" aria-label="打开导航菜单">
        <SvgIcon name="menu" size={24} className="text-foreground" />
      </Button>

      {/* 遮罩层：fade in/out */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* 抽屉主体：从左侧滑入；关闭时 aria-hidden 使屏幕阅读器忽略 */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!isOpen}
        data-open={isOpen}
        aria-label="移动端导航抽屉"
      >
        {/* 顶部：Logo + 关闭按钮 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <NavbarLogo />
          <Button
            variant="ghost"
            onClick={close}
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
