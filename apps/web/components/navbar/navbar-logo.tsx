"use client";

import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import { useTheme } from "../../app/providers/theme-provider";

export function NavbarLogo() {
  const { resolvedTheme } = useTheme();
  const iconName = resolvedTheme === "dark" ? "logo-frequencii-dark" : "logo-frequencii-light";

  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <SvgIcon name={iconName} size={120} className="h-8 w-auto" />
      {/* 网站名仅在 md+ 显示 */}
      <span className="hidden md:block text-sm font-medium text-foreground">Yevpt&apos;s Blog</span>
    </Link>
  );
}
