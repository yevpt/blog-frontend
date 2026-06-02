"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";

type ResolvedTheme = "light" | "dark";

const THEME_ICONS: Record<ResolvedTheme, "sun" | "moon"> = {
  light: "sun",
  dark: "moon",
};

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
      {/* 主题切换按钮 */}
      <Button
        variant="ghost"
        onPress={() => setTheme(nextTheme)}
        className={cn(
          "p-2 rounded-md transition-colors duration-300",
          !isGlass && "hover:bg-white/20",
        )}
        aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
      >
        <SvgIcon
          name={THEME_ICONS[resolvedTheme]}
          size={20}
          className={cn(
            "transition-colors duration-300",
            isGlass ? "text-foreground" : "text-white/85",
          )}
        />
      </Button>

      {/* 登录按钮（仅 md+，注册按钮已移除） */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "transition-colors duration-300",
          !isGlass &&
            "border-white/60 text-white bg-transparent hover:bg-white/20 hover:text-white hover:border-white",
        )}
      >
        {t("auth.login")}
      </Button>
    </div>
  );
}
