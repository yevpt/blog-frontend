"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useLocale } from "@repo/hooks";
import { useTheme } from "../../app/providers/theme-provider";

const MOBILE_NAV_ITEMS = [
  { key: "snippets", href: "/snippets", label: "碎语" },
  { key: "guestbook", href: "/guestbook", label: "留言" },
  { key: "friends", href: "/friends", label: "友邻" },
  { key: "circle", href: "/circle", label: "圈子" },
] as const;

interface NavbarMobileMenuProps {
  isGlass: boolean;
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
}

export function NavbarMobileMenu({ isGlass, menuOpen, onMenuToggle }: NavbarMobileMenuProps) {
  const { t } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();

  // Escape 键关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMenuToggle(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, onMenuToggle]);

  const iconColor = isGlass ? "text-foreground" : "text-white/85";

  return (
    <div className="md:hidden">
      {/* 汉堡按钮：三条线 → X 动画 */}
      <button
        type="button"
        onClick={() => onMenuToggle(!menuOpen)}
        aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
        aria-expanded={menuOpen}
        className={cn(
          "p-2 rounded-md transition-colors duration-300",
          !isGlass && "hover:bg-white/20",
        )}
      >
        <SvgIcon
          name={menuOpen ? "close" : "menu"}
          size={24}
          className={cn("transition-colors duration-300", iconColor)}
        />
      </button>

      {/* 内联展开菜单：grid-template-rows 0fr → 1fr */}
      <div
        className={cn(
          "absolute top-full left-0 right-0 overflow-hidden",
          "transition-[grid-template-rows] duration-300",
          "[background:var(--glass-mob)] backdrop-blur-[20px]",
          "border-t border-white/10",
        )}
        style={{ display: "grid", gridTemplateRows: menuOpen ? "1fr" : "0fr" }}
        aria-hidden={!menuOpen}
      >
        <div className="overflow-hidden">
          <div className="px-4 py-4 flex flex-col gap-1">
            {MOBILE_NAV_ITEMS.map(({ key, href, label }) => (
              <Link
                key={key}
                href={href}
                onClick={() => onMenuToggle(false)}
                className="flex items-center justify-between py-3 text-sm font-medium text-foreground border-b border-border/30 last:border-0"
              >
                {label}
                <span className="text-muted-foreground text-xs">›</span>
              </Link>
            ))}

            {/* 分隔线 */}
            <div className="my-2 border-t border-border/30" />

            {/* 底部：主题切换 + 登录 */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex items-center gap-2 text-sm text-foreground py-2"
                aria-label={resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              >
                <SvgIcon
                  name={resolvedTheme === "dark" ? "moon" : "sun"}
                  size={16}
                  className="text-muted-foreground"
                />
                {resolvedTheme === "dark" ? "深色模式" : "浅色模式"}
              </button>
              <Button variant="outline" size="sm" onClick={() => onMenuToggle(false)}>
                {t("auth.login")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
