"use client";

import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useArticleEngagement } from "@/hooks/use-article-engagement";
import { useArticleMusic } from "@/store/use-article-music";
import { ArticleMusicControl } from "@/components/article-detail/article-music-control";
import { NavbarLogo } from "./navbar-logo";
import type { NavbarMobileVariant } from "./navbar-route-config";

interface NavbarMobileHeaderProps {
  mobileVariant: NavbarMobileVariant;
  title?: string;
  isGlass: boolean;
  menuOpen: boolean;
  unreadCount?: number;
  onToggleMenu: () => void;
}

function formatCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

interface NavbarMobileMenuButtonProps {
  isGlass: boolean;
  menuOpen: boolean;
  unreadCount?: number;
  onToggleMenu: () => void;
}

function NavbarMobileMenuButton({
  isGlass,
  menuOpen,
  unreadCount = 0,
  onToggleMenu,
}: NavbarMobileMenuButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onPress={onToggleMenu}
      aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
      className={cn(
        "relative flex h-[34px] w-[34px] cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[9px] p-[9px] text-foreground transition-colors",
        isGlass ? "bg-primary/10 text-primary" : "bg-foreground/5",
      )}
    >
      {unreadCount > 0 && (
        <span
          data-testid="mobile-menu-unread-dot"
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
        />
      )}
      <span
        className={cn(
          "block h-[1.5px] w-full rounded bg-current transition-transform",
          menuOpen && "translate-y-[6.5px] rotate-45",
        )}
      />
      <span
        className={cn(
          "block h-[1.5px] w-full rounded bg-current transition-[opacity,transform]",
          menuOpen && "scale-x-0 opacity-0",
        )}
      />
      <span
        className={cn(
          "block h-[1.5px] w-full rounded bg-current transition-transform",
          menuOpen && "-translate-y-[6.5px] -rotate-45",
        )}
      />
    </Button>
  );
}

function NavbarMobileArticleActions() {
  const { likeCount, commentCount, isLiked, isLiking, toggleLike } = useArticleEngagement();
  const hasMusic = Boolean(useArticleMusic((state) => state.track));

  const actionButtonClass =
    "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors hover:bg-foreground/5 text-black/54 dark:text-(--fg3)";

  return (
    <>
      {hasMusic ? <ArticleMusicControl variant="navbar" /> : null}
      <Button
        type="button"
        variant="ghost"
        aria-label={`点赞 ${formatCount(likeCount)}`}
        isDisabled={isLiking}
        onPress={() => void toggleLike()}
        className={cn(actionButtonClass, isLiked && "text-red-500 hover:text-red-500")}
      >
        <SvgIcon className="animate-[heartbeat_3s_ease-in-out_infinite]" name="heart" size={21} />
        <span>{formatCount(likeCount)}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label={`评论 ${formatCount(commentCount)}`}
        onPress={() => {
          document.getElementById("article-comments")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
        className={actionButtonClass}
      >
        <SvgIcon name="message-circle" size={21} />
        <span>{formatCount(commentCount)}</span>
      </Button>
    </>
  );
}

export function NavbarMobileHeader({
  mobileVariant,
  title,
  isGlass,
  menuOpen,
  unreadCount = 0,
  onToggleMenu,
}: NavbarMobileHeaderProps) {
  const router = useRouter();

  if (mobileVariant === "home") {
    return (
      <div className="flex min-h-[52px] items-center justify-between px-4 md:hidden">
        <NavbarLogo isGlass={isGlass} />
        <NavbarMobileMenuButton
          isGlass={isGlass}
          menuOpen={menuOpen}
          unreadCount={unreadCount}
          onToggleMenu={onToggleMenu}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[52px] px-3 items-center md:hidden")}>
      <Button
        type="button"
        variant="ghost"
        aria-label="返回首页"
        onPress={() => router.push("/")}
        className="flex h-8 w-8 items-center justify-center rounded-full p-0 text-foreground transition-colors hover:bg-foreground/5"
      >
        <SvgIcon name="arrow-back" size={21} />
      </Button>

      <div className="min-w-0 flex-1 text-center">
        {mobileVariant === "default" ? (
          <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {mobileVariant === "article" ? <NavbarMobileArticleActions /> : null}
        <NavbarMobileMenuButton
          isGlass={isGlass}
          menuOpen={menuOpen}
          unreadCount={unreadCount}
          onToggleMenu={onToggleMenu}
        />
      </div>
    </div>
  );
}
