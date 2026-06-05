"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { UserAvatar } from "@/components/common/user-avatar";
import { NAV_ITEMS } from "./nav-items";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavbarMobileMenu({ isOpen, onClose }: NavbarMobileMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { userId, profile } = useSession();
  const router = useRouter();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const displayName = profile?.nickname ?? profile?.username ?? "我的账号";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.refresh();
    onClose();
  }

  const navLinkClass =
    "flex min-h-10 items-center justify-between rounded-[14px] px-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.05] dark:hover:bg-white/10";
  const actionClass =
    "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[13px] bg-foreground/[0.04] px-3 text-[12px] font-semibold text-[var(--fg2)] transition-colors hover:bg-primary/[0.10] hover:text-primary dark:bg-white/[0.06]";
  const themeLabel = resolvedTheme === "dark" ? "深色" : "浅色";

  const themeToggle = (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={actionClass}
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
    >
      <SvgIcon name={resolvedTheme === "dark" ? "moon" : "sun"} size={18} />
      <span>{themeLabel}</span>
    </button>
  );

  return (
    <div
      data-testid="mobile-nav-menu"
      className={cn(
        "grid opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-3 pb-3">
          <div className="border-t border-border/60 pt-3">
            {userId != null ? (
              <Link
                href="/profile"
                onClick={onClose}
                className="flex min-w-0 items-center gap-3 rounded-[18px] bg-gradient-to-br from-primary/[0.10] to-amber-500/[0.13] px-3 py-3 transition-colors hover:from-primary/[0.14] hover:to-amber-500/[0.18]"
              >
                <UserAvatar
                  src={profile?.avatar_url ?? undefined}
                  name={displayName}
                  size="md"
                  className="h-9 w-9 text-[13px]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold leading-tight text-foreground">
                    {displayName}
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-medium text-[var(--fg3)]">
                    查看个人主页
                  </span>
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-[18px] bg-gradient-to-br from-primary/[0.10] to-amber-500/[0.13] px-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.14] text-primary">
                  <SvgIcon name="user" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold leading-tight text-foreground">
                    欢迎回来
                  </p>
                  <p className="mt-1 truncate text-[11px] font-medium text-[var(--fg3)]">
                    登录后可查看消息与个人主页
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => {
                    openLoginModal();
                    onClose();
                  }}
                  className="h-8 shrink-0 rounded-full bg-foreground px-4 text-[12px] font-bold text-background hover:bg-foreground/85"
                >
                  {t("auth.login")}
                </Button>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className={navLinkClass}>
                  <span>{item.label}</span>
                  <SvgIcon name="chevron-right" size={15} className="text-[var(--fg3)]" />
                </Link>
              ))}
            </div>

            {userId != null ? (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <Link href="/messages" onClick={onClose} aria-label="消息" className={actionClass}>
                  <SvgIcon name="message-circle" size={18} />
                  <span>消息</span>
                </Link>
                {themeToggle}
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="退出登录"
                  className={cn(
                    actionClass,
                    "bg-destructive/[0.10] text-destructive/80 hover:bg-destructive/[0.14] hover:text-destructive",
                  )}
                >
                  <SvgIcon name="log-out" size={18} />
                  <span>退出</span>
                </button>
              </div>
            ) : (
              <div className="mt-3 border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => setTheme(nextTheme)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-foreground/[0.04]"
                  aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
                >
                  <div className="flex items-center gap-2.5">
                    <SvgIcon
                      name={resolvedTheme === "dark" ? "moon" : "sun"}
                      size={15}
                      className="text-[var(--fg2)] opacity-75"
                    />
                    <span className="text-[13px] font-medium text-[var(--fg2)]">
                      {resolvedTheme === "dark" ? "深色模式" : "浅色模式"}
                    </span>
                  </div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
