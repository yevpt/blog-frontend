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
  const { user } = useSession();
  const router = useRouter();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const displayName = user ? (user.nickname ?? user.username) : "";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.refresh();
    onClose();
  }

  const themeToggle = (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[var(--fg2)]"
    >
      <span
        className={cn(
          "relative h-[22px] w-10 rounded-full border transition-colors",
          resolvedTheme === "dark" ? "border-primary bg-primary" : "border-border bg-border",
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

          {user ? (
            <>
              {/* 用户信息行：头像+名字 → /profile，右侧消息+退出图标 */}
              <div className="mb-1 flex items-center justify-between px-0.5">
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <UserAvatar name={displayName} size="xs" />
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {displayName}
                  </span>
                </Link>
                <div className="ml-2 flex shrink-0 items-center gap-0.5">
                  <Link
                    href="/messages"
                    onClick={onClose}
                    aria-label="消息"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg2)] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <SvgIcon name="message-circle" size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="退出登录"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/70 transition-colors hover:bg-destructive/[0.08]"
                  >
                    <SvgIcon name="log-out" size={16} />
                  </button>
                </div>
              </div>
              {/* 主题行 */}
              <div className="flex items-center px-0.5 pt-1">{themeToggle}</div>
            </>
          ) : (
            <div className="flex items-center justify-between px-0.5 pt-0.5">
              {themeToggle}
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
          )}
        </div>
      </div>
    </div>
  );
}
