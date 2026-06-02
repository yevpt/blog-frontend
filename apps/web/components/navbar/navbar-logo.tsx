import Link from "next/link";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

interface NavbarLogoProps {
  isGlass?: boolean;
}

export function NavbarLogo({ isGlass = false }: NavbarLogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      {isGlass ? (
        // 玻璃态：跟随主题切换 logo
        <>
          <SvgIcon name="logo-frequencii-light" size={120} className="h-8 w-auto dark:hidden" />
          <SvgIcon
            name="logo-frequencii-dark"
            size={120}
            className="hidden h-8 w-auto dark:block"
          />
        </>
      ) : (
        // over-hero：统一显示白色 logo（dark 版本在深色背景上天然显白）
        <SvgIcon name="logo-frequencii-dark" size={120} className="h-8 w-auto opacity-85" />
      )}
      <span
        className={cn(
          "hidden md:block text-sm font-medium transition-colors duration-300",
          isGlass ? "text-foreground" : "text-white/85",
        )}
      >
        Yevpt&apos;s Blog
      </span>
    </Link>
  );
}
