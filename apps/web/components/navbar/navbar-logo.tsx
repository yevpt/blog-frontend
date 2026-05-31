import Link from "next/link";
import { SvgIcon } from "@repo/icons";

export function NavbarLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      {/* 用 CSS 切换 logo，避免主题 state 导致 hydration mismatch */}
      <SvgIcon name="logo-frequencii-light" size={120} className="h-8 w-auto dark:hidden" />
      <SvgIcon name="logo-frequencii-dark" size={120} className="hidden h-8 w-auto dark:block" />
      {/* 网站名仅在 md+ 显示 */}
      <span className="hidden md:block text-sm font-medium text-foreground">Yevpt&apos;s Blog</span>
    </Link>
  );
}
