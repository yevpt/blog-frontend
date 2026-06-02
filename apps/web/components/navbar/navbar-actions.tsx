"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
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

export function NavbarActions() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const nextTheme = getOppositeTheme(resolvedTheme);

  return (
    <div className="flex items-center gap-2">
      {/* 主题切换按钮：所有端均显示。按钮只在 light/dark 间切换，不再写入 system。 */}
      <Button
        variant="ghost"
        onPress={() => setTheme(nextTheme)}
        className="p-2 rounded-md"
        aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
      >
        <SvgIcon name={THEME_ICONS[resolvedTheme]} size={20} className="text-foreground" />
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
