"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileMenu } from "./navbar-mobile-menu";

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // mounted=false 时导航完全不可见（opacity-0）；
  // IO 首次回调确定正确的玻璃态后，下一帧再置为 true，导航以淡入动效整体弹出。
  // 这样无论页面停在何处刷新，弹出时都已是完整形态（胶囊或非胶囊），永不裸露。
  const [mounted, setMounted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    let initialized = false;
    let raf = 0;
    // iOS 橡皮筋效果会让哨兵在视口内快速进出，导致玻璃态闪烁。
    // 对"哨兵进入视口（回到顶部）"方向加防抖：若短时间内哨兵又离开（弹回），则取消本次更新。
    let enterTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(([entry]) => {
      if (!initialized) {
        // 首次回调：立即确定初始玻璃态，下一帧显示导航
        initialized = true;
        setScrolled(!entry.isIntersecting);
        raf = requestAnimationFrame(() => setMounted(true));
        return;
      }

      if (entry.isIntersecting) {
        // 哨兵进入视口（回到顶部）：防抖 80ms，过滤橡皮筋引起的瞬间触发
        enterTimer = setTimeout(() => {
          enterTimer = null;
          setScrolled(false);
        }, 80);
      } else {
        // 哨兵离开视口（向下滚动）：立即响应，并取消挂起的回到顶部更新
        if (enterTimer !== null) {
          clearTimeout(enterTimer);
          enterTimer = null;
        }
        setScrolled(true);
      }
    });
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      if (enterTimer !== null) clearTimeout(enterTimer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isGlass = scrolled || menuOpen;

  return (
    <>
      {/* 顶部滚动哨兵：absolute 锚定文档顶部并随页面滚动，高度即玻璃态阈值（60px）。
          滚动超过其高度后离开视口，由上方 IntersectionObserver 判定为已滚动。
          必须置于 fixed 的 <nav> 之外，否则会随导航固定而无法滚出视口。 */}
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-[60px] w-px"
      />
      <nav
        id="navbar"
        data-glass={isGlass}
        data-menu-open={menuOpen}
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none",
          // 入场前隐藏；入场后开启过渡（opacity 入场 + 后续 padding/glass 过渡共用同一 transition）
          "transition-[opacity,padding,background,backdrop-filter,border-color,box-shadow] duration-300 ease-out",
          mounted ? "opacity-100" : "opacity-0",
          scrolled ? "lg:px-0 px-5 py-2.5" : "lg:px-0 px-5 py-[18px]",
          "max-md:pointer-events-auto max-md:p-0",
          isGlass
            ? "max-md:border-b max-md:border-black/5 max-md:[background:var(--glass-mob)] max-md:backdrop-blur-[22px] max-md:[backdrop-filter:blur(22px)_saturate(200%)] dark:max-md:border-white/10"
            : "max-md:bg-transparent",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto flex w-full max-w-[1120px] flex-col overflow-hidden rounded-full border border-transparent",
            // mounted 后才开启内层过渡，避免玻璃态初始化时触发不必要动画
            mounted &&
              "transition-[background,border-color,box-shadow,backdrop-filter,border-radius] duration-300 ease-out",
            isGlass &&
              "border-[var(--glass-bdr)] bg-[var(--glass-bg)] shadow-[0_0_0_1px_var(--glass-ring),0_4px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)]",
            menuOpen && "rounded-[24px]",
            "max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none max-md:backdrop-blur-none max-md:[backdrop-filter:none]",
          )}
        >
          <div className="flex min-h-[52px] items-center justify-between px-4 md:min-h-0 md:px-4 md:py-[9px]">
            <NavbarLogo isGlass={isGlass} />

            <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
              <NavbarLinks isGlass={isGlass} />
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <NavbarActions isGlass={isGlass} />
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
              className={cn(
                "flex h-[34px] w-[34px] cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[9px] p-[9px] text-foreground transition-colors md:hidden",
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
          </div>

          <NavbarMobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
      </nav>
    </>
  );
}
