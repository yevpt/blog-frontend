"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";

type ThemeMode = "system" | "light" | "dark";

/** 三态循环顺序：system → light → dark → system */
const THEME_CYCLE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const THEME_ICONS: Record<ThemeMode, "monitor" | "sun" | "moon"> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

export function NavbarActions() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-2">
      {/* 主题切换按钮：所有端均显示 */}
      <Button
        variant="ghost"
        onPress={() => setTheme(THEME_CYCLE[theme])}
        className="p-2 rounded-md"
        aria-label={`当前主题：${theme}，点击切换`}
      >
        <SvgIcon name={THEME_ICONS[theme]} size={20} className="text-foreground" />
      </Button>

      {/* 登录/注册按钮：仅 md+ 显示（mobile 在抽屉里） */}
      <div className="hidden md:flex items-center gap-2">
        <Button variant="outline" size="sm">
          {t("auth.login")}
        </Button>
        <Button variant="default" size="sm">
          {t("auth.register")}
        </Button>
      </div>
    </div>
  );
}
