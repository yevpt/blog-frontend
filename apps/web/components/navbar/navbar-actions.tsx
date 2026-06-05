"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { NavbarUserMenu } from "./navbar-user-menu";

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
  const { open: openLoginModal } = useLoginModal();
  const { userId } = useSession();
  const nextTheme = getOppositeTheme(resolvedTheme);

  return (
    <div data-testid="navbar-actions" className="flex items-center gap-3">
      <Button
        variant="ghost"
        onPress={() => setTheme(nextTheme)}
        className="h-8 w-8 rounded-lg p-0 text-[var(--fg2)] hover:bg-foreground/5 hover:text-foreground data-[glass=true]:text-[var(--fg2)] data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary"
        aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
        data-glass={isGlass}
      >
        <SvgIcon name={THEME_ICONS[resolvedTheme]} size={18} />
      </Button>

      <div className="hidden items-center gap-3 md:flex">
        {userId != null ? (
          <NavbarUserMenu isGlass={isGlass} />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onPress={() => openLoginModal()}
            className={cn(
              "h-8 rounded-full border-border bg-foreground/5 px-4 text-xs font-semibold text-foreground hover:bg-foreground/10 hover:text-foreground",
              "data-[glass=true]:border-border data-[glass=true]:bg-transparent data-[glass=true]:text-[var(--fg2)] data-[glass=true]:hover:border-primary data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary",
            )}
            data-glass={isGlass}
          >
            {t("auth.login")}
          </Button>
        )}
      </div>
    </div>
  );
}
