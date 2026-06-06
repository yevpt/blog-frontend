"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@repo/hooks";
import { cn } from "@repo/ui";
import { NAV_ITEMS } from "./nav-items";

interface NavbarLinksProps {
  /** 竖向排列（用于移动端抽屉），默认 false（横向排列） */
  vertical?: boolean;
  /** 点击链接后的回调（用于关闭抽屉） */
  onLinkClick?: () => void;
  isGlass?: boolean;
}

export function NavbarLinks({ vertical = false, onLinkClick, isGlass = false }: NavbarLinksProps) {
  const { t } = useLocale();
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex gap-6",
        vertical && "flex-col gap-4",
        // 横向模式默认只在 md+ 显示（移动端由抽屉负责）
        !vertical && "hidden md:flex",
      )}
    >
      {NAV_ITEMS.map(({ key, label, href }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={key}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "text-sm font-medium transition-colors",
              vertical && "text-base",
              !vertical &&
                (isGlass
                  ? isActive
                    ? "text-foreground"
                    : "text-[var(--fg2)] hover:text-foreground"
                  : isActive
                    ? "text-foreground"
                    : "text-[var(--fg2)] hover:text-foreground"),
              vertical && "text-foreground hover:text-primary",
            )}
          >
            {label ?? t(`nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
