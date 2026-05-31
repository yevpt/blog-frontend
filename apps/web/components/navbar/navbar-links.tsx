"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@repo/hooks/locale";
import { cn } from "@repo/ui";

const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "snippets", href: "/snippets" },
  { key: "guestbook", href: "/guestbook" },
  { key: "friends", href: "/friends" },
  { key: "circle", href: "/circle" },
] as const;

interface NavbarLinksProps {
  /** 竖向排列（用于移动端抽屉），默认 false（横向排列） */
  vertical?: boolean;
  /** 点击链接后的回调（用于关闭抽屉） */
  onLinkClick?: () => void;
}

export function NavbarLinks({ vertical = false, onLinkClick }: NavbarLinksProps) {
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
      {NAV_ITEMS.map(({ key, href }) => {
        // 首页精确匹配，其余页面前缀匹配
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={key}
            href={href}
            onClick={onLinkClick}
            className={cn(
              "text-sm font-medium transition-colors",
              vertical && "text-base",
              isActive ? "text-foreground" : "text-foreground/70 hover:text-foreground",
            )}
          >
            {t(`nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
