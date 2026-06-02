"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@repo/hooks";
import { cn } from "@repo/ui";

const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "snippets", href: "/snippets" },
  { key: "guestbook", href: "/guestbook" },
  { key: "friends", href: "/friends" },
  { key: "circle", href: "/circle" },
] as const;

interface NavbarLinksProps {
  /** 竖向排列（用于移动端菜单），默认 false */
  vertical?: boolean;
  /** 点击链接后的回调（用于关闭菜单） */
  onLinkClick?: () => void;
  /** 是否处于玻璃态（影响文字颜色） */
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
        // 横向模式只在 md+ 显示
        !vertical && "hidden md:flex",
      )}
    >
      {NAV_ITEMS.map(({ key, href }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={key}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "text-sm font-medium transition-colors duration-300",
              vertical && "text-base",
              isGlass
                ? isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                : isActive
                  ? "text-white"
                  : "text-white/70 hover:text-white",
            )}
          >
            {t(`nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
