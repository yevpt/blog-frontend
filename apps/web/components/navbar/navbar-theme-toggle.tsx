"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";

type ResolvedTheme = "light" | "dark";

const THEME_ICONS: Record<ResolvedTheme, "sun" | "moon"> = {
  light: "sun",
  dark: "moon",
};

function getOppositeTheme(theme: ResolvedTheme): ResolvedTheme {
  return theme === "dark" ? "light" : "dark";
}

interface NavbarThemeToggleProps {
  isGlass?: boolean;
}

/** 独立订阅 ThemeContext，避免主题切换连带重渲染 NavbarUserMenu / UserAvatar */
export function NavbarThemeToggle({ isGlass = false }: NavbarThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = getOppositeTheme(resolvedTheme);

  return (
    <Button
      variant="ghost"
      onPress={() => setTheme(nextTheme)}
      className="h-8 w-8 rounded-lg p-0 text-(--fg2) hover:bg-foreground/5 hover:text-foreground data-[glass=true]:text-(--fg2) data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary"
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
      data-glass={isGlass}
    >
      <SvgIcon name={THEME_ICONS[resolvedTheme]} size={18} />
    </Button>
  );
}

interface NavbarMobileThemeToggleProps {
  className?: string;
}

/** 移动端抽屉内的主题切换行，同样隔离 ThemeContext 订阅范围 */
export function NavbarMobileThemeToggle({ className }: NavbarMobileThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={className}
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/[0.10]">
        <SvgIcon
          name={resolvedTheme === "dark" ? "moon" : "sun"}
          size={14}
          className="text-amber-500"
        />
      </div>
      <span className="flex-1 text-left text-[13px] font-medium text-foreground">
        {resolvedTheme === "dark" ? "深色模式" : "浅色模式"}
      </span>
      <div
        className={cn(
          "relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          resolvedTheme === "dark" ? "bg-primary/80" : "bg-foreground/20",
        )}
      >
        <div
          className={cn(
            "absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            resolvedTheme === "dark" ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}
