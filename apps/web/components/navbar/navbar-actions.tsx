"use client";

import { Button, cn } from "@repo/ui";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { NavbarUserMenu } from "./navbar-user-menu";
import { NavbarThemeToggle } from "./navbar-theme-toggle";

interface NavbarActionsProps {
  isGlass?: boolean;
  unreadCount?: number;
}

export function NavbarActions({ isGlass = false, unreadCount = 0 }: NavbarActionsProps) {
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { userId } = useSession();

  return (
    <div data-testid="navbar-actions" className="flex items-center gap-3">
      <NavbarThemeToggle isGlass={isGlass} />

      <div className="hidden items-center gap-3 md:flex">
        {userId != null ? (
          <NavbarUserMenu isGlass={isGlass} unreadCount={unreadCount} />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => openLoginModal()}
            className={cn(
              "h-8 rounded-full border-border bg-foreground/5 px-4 text-xs font-semibold text-foreground hover:bg-foreground/10 hover:text-foreground",
              "data-[glass=true]:border-border data-[glass=true]:bg-transparent data-[glass=true]:text-(--fg2) data-[glass=true]:hover:border-primary data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary",
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
