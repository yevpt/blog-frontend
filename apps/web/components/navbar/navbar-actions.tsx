"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";

type ResolvedTheme = "light" | "dark";

const THEME_ICONS: Record<ResolvedTheme, "sun" | "moon"> = {
  light: "sun",
  dark: "moon",
};

/** 主题按钮永远切到“当前实际生效主题”的对立面，system 只影响当前生效值如何解析。 */
function getOppositeTheme(theme: ResolvedTheme): ResolvedTheme {
  return theme === "dark" ? "light" : "dark";
}

interface NavbarActionsProps {
  isGlass?: boolean;
}

export function NavbarActions({ isGlass = false }: NavbarActionsProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const nextTheme = getOppositeTheme(resolvedTheme);

  return (
    <div className="flex items-center gap-2">
      {/* 主题切换按钮：所有端均显示。按钮只在 light/dark 间切换，不再写入 system。 */}
      <Button
        variant="ghost"
        onPress={() => setTheme(nextTheme)}
        className="h-8 w-8 rounded-lg p-0 text-[var(--fg2)] hover:bg-foreground/5 hover:text-foreground data-[glass=true]:text-[var(--fg2)] data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary"
        aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
        data-glass={isGlass}
      >
        <SvgIcon name={THEME_ICONS[resolvedTheme]} size={18} />
      </Button>

      {/* 登录按钮：仅 md+ 显示（mobile 在展开菜单里） */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 rounded-full border-border bg-foreground/5 px-4 text-xs font-semibold text-foreground hover:bg-foreground/10 hover:text-foreground",
            "data-[glass=true]:border-border data-[glass=true]:bg-transparent data-[glass=true]:text-[var(--fg2)] data-[glass=true]:hover:border-primary data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary",
          )}
          data-glass={isGlass}
        >
          {t("auth.login")}
        </Button>
      </div>
    </div>
  );
}
