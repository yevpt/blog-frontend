"use client";

import Link from "next/link";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";

const MOBILE_ITEMS = [
  { label: "碎语", href: "/snippets" },
  { label: "留言", href: "/guestbook" },
  { label: "友邻", href: "/friends" },
  { label: "圈子", href: "/circle" },
] as const;

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavbarMobileMenu({ isOpen, onClose }: NavbarMobileMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <div
      data-testid="mobile-nav-menu"
      className={cn(
        "grid opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-4 pb-[18px]">
          <div className="mb-2 h-px bg-border" />
          <div className="mb-4 flex flex-col gap-0.5">
            {MOBILE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between rounded-[10px] px-2.5 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span>{item.label}</span>
                <span className="text-[15px] text-[var(--fg3)]">›</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between px-0.5 pt-0.5">
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[var(--fg2)]"
            >
              <span
                className={cn(
                  "relative h-[22px] w-10 rounded-full border transition-colors",
                  resolvedTheme === "dark"
                    ? "border-primary bg-primary"
                    : "border-border bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    resolvedTheme === "dark" && "translate-x-[18px]",
                  )}
                />
              </span>
              深色模式
            </button>
            <Button
              variant="default"
              size="sm"
              onPress={() => {
                openLoginModal();
                onClose();
              }}
              className="h-8 rounded-full bg-foreground px-5 text-[13px] font-bold text-background hover:bg-foreground/85"
            >
              {t("auth.login")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
