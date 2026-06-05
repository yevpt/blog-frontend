"use client";

import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useArticleEngagement } from "@/hooks/use-article-engagement";
import { NavbarLogo } from "./navbar-logo";
import type { NavbarMobileVariant } from "./navbar-route-config";

interface NavbarMobileHeaderProps {
  mobileVariant: NavbarMobileVariant;
  title?: string;
  isGlass: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

function formatCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

interface NavbarMobileMenuButtonProps {
  isGlass: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

function NavbarMobileMenuButton({ isGlass, menuOpen, onToggleMenu }: NavbarMobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggleMenu}
      aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
      className={cn(
        "flex h-[34px] w-[34px] cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[9px] p-[9px] text-foreground transition-colors",
        isGlass ? "bg-primary/10 text-primary" : "bg-foreground/5",
      )}
    >
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
    </button>
  );
}

function NavbarMobileArticleActions() {
  const { likeCount, commentCount, isLiked, isLiking, toggleLike } = useArticleEngagement();

  const actionButtonClass =
    "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/5";

  return (
    <>
      <button
        type="button"
        aria-label={`点赞 ${formatCount(likeCount)}`}
        disabled={isLiking}
        onClick={() => void toggleLike()}
        className={cn(actionButtonClass, isLiked && "text-primary")}
      >
        <SvgIcon name="heart" size={16} />
        <span>{formatCount(likeCount)}</span>
      </button>
      <button
        type="button"
        aria-label={`评论 ${formatCount(commentCount)}`}
        onClick={() => {
          document.getElementById("article-comments")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
        className={actionButtonClass}
      >
        <SvgIcon name="message-circle" size={16} />
        <span>{formatCount(commentCount)}</span>
      </button>
    </>
  );
}

export function NavbarMobileHeader({
  mobileVariant,
  title,
  isGlass,
  menuOpen,
  onToggleMenu,
}: NavbarMobileHeaderProps) {
  const router = useRouter();

  if (mobileVariant === "home") {
    return (
      <div className="flex min-h-[52px] items-center justify-between px-4 md:hidden">
        <NavbarLogo isGlass={isGlass} />
        <NavbarMobileMenuButton isGlass={isGlass} menuOpen={menuOpen} onToggleMenu={onToggleMenu} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[52px] items-center justify-between gap-2 px-4 md:hidden">
      <button
        type="button"
        aria-label="返回首页"
        onClick={() => router.push("/")}
        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5"
      >
        <SvgIcon name="chevron-left" size={18} />
      </button>

      <div className="min-w-0 flex-1 text-center">
        {mobileVariant === "default" ? (
          <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {mobileVariant === "article" ? <NavbarMobileArticleActions /> : null}
        <NavbarMobileMenuButton isGlass={isGlass} menuOpen={menuOpen} onToggleMenu={onToggleMenu} />
      </div>
    </div>
  );
}
