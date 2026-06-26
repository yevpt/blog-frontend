"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { isAdminUser } from "@/lib/user-roles";
import { UserAvatar } from "@/components/common/user-avatar";
import { NAV_ITEMS } from "./nav-items";
import { openAdminPanel } from "./admin-panel";

interface NavbarMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount?: number;
}

export function NavbarMobileMenu({ isOpen, onClose, unreadCount }: NavbarMobileMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { userId, profile } = useSession();
  const router = useRouter();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const displayName = profile?.nickname ?? profile?.username ?? "我的账号";
  const isAdmin = isAdminUser(profile?.roles);

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

  const cardClass = "rounded-2xl bg-gradient-to-br from-primary/[0.08] to-amber-500/[0.10]";

  const listRowClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] transition-colors hover:bg-foreground/[0.04]";

  // 登录态和未登录态共用同一主题切换行；使用原生 button，避免 Button 的按压缩放带动整行抖动
  const themeRow = (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={cn(
        listRowClass,
        "border-0 bg-transparent font-inherit outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
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
            {/* ── 用户卡片区 ── */}
            {userId != null ? (
              <div className={cn("flex min-w-0 items-center gap-2 px-3 py-[11px]", cardClass)}>
                <Link
                  href={userId != null ? `/users/${userId}` : "/profile"}
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
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
                    <span className="mt-1 block truncate text-[11px] font-medium text-(--fg3)">
                      查看个人主页
                    </span>
                  </span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  onPress={handleLogout}
                  aria-label="退出登录"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-foreground/[0.28] transition-all duration-150 hover:bg-destructive/10 hover:text-destructive/70 active:scale-90 dark:text-foreground/[0.45] dark:hover:bg-destructive/15 dark:hover:text-destructive/80 cursor-pointer"
                >
                  <SvgIcon name="log-out" size={16} />
                </Button>
              </div>
            ) : (
              <div className={cn("flex items-center gap-3 px-3 py-3", cardClass)}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.14] text-primary">
                  <SvgIcon name="user" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold leading-tight text-foreground">
                    欢迎回来
                  </p>
                  <p className="mt-1 truncate text-[11px] font-medium text-(--fg3)">
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

            {/* ── 导航项 ── */}
            <div className="mt-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className={navLinkClass}>
                  <span>{item.label}</span>
                  <SvgIcon name="chevron-right" size={15} className="text-(--fg3)" />
                </Link>
              ))}
            </div>

            {/* ── 底部操作区 ── */}
            <div className="mt-2 border-t border-border/60 pt-2">
              {userId != null && (
                <Link
                  href="/notifications"
                  onClick={onClose}
                  aria-label="我的消息"
                  className={listRowClass}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.10]">
                    <SvgIcon name="bell" size={14} className="text-primary" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-foreground">我的消息</span>
                  {unreadCount != null && unreadCount > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </span>
                  )}
                </Link>
              )}
              {userId != null && isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    openAdminPanel();
                    onClose();
                  }}
                  aria-label="管理后台"
                  className={cn(
                    listRowClass,
                    "border-0 bg-transparent font-inherit outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/[0.10]">
                    <SvgIcon
                      name="monitor"
                      size={14}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <span className="flex-1 text-left text-[13px] font-medium text-foreground">
                    管理后台
                  </span>
                  <SvgIcon name="arrow-up-right" size={13} className="shrink-0 text-(--fg3)" />
                </button>
              )}
              {themeRow}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
