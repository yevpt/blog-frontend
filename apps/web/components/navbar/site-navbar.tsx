"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@repo/ui";
import { NavbarLogo } from "./navbar-logo";
import { NavbarLinks } from "./navbar-links";
import { NavbarActions } from "./navbar-actions";
import { NavbarMobileHeader } from "./navbar-mobile-header";
import { NavbarMobileMenu } from "./navbar-mobile-menu";
import { useNavbarContext } from "./use-navbar-context";

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navbarContext = useNavbarContext();
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
      {/* 顶部滚动哨兵：absolute 锚定文档顶部并随页面滚动，高度即玻璃态阈值。
          滚动超过其高度后离开视口，由上方 IntersectionObserver 判定为已滚动。
          必须置于 fixed 的 <nav> 之外，否则会随导航固定而无法滚出视口。 */}
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 w-px"
        style={{ height: `${navbarContext.desktopCapsuleThreshold}px` }}
      />
      {menuOpen && (
        <button
          type="button"
          aria-label="关闭导航遮罩"
          data-testid="mobile-nav-overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-background/55 backdrop-blur-sm transition-opacity md:hidden"
        />
      )}
      <nav
        id="navbar"
        data-glass={isGlass}
        data-menu-open={menuOpen}
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none",
          // 入场前隐藏；入场后开启过渡（opacity 入场 + 后续 padding/glass 过渡共用同一 transition）
          // backdrop-filter 不参与过渡：动画 backdrop-filter 在 Chrome/Safari 中会触发合成层竞争导致闪烁
          "transition-[opacity,padding,background,border-color,box-shadow] duration-300 ease-out",
          mounted ? "opacity-100" : "opacity-0",
          scrolled ? "px-5 py-2.5" : "px-5 py-[18px]",
        )}
      >
        <div
          className={cn(
            // 移动端固定 rounded-[24px]，桌面端固定 rounded-full。
            // 不做响应式以外的 border-radius 过渡，避免 overflow-hidden 在过渡中
            // 把内容剪切成椭圆形，产生"四周内陷"的视觉抖动。
            // [transform:translateZ(0)]：始终持有独立 GPU 合成层，防止 backdrop-filter
            // 在 glass 态切换期间动态创建合成层，与 Tabs SelectionIndicator 等子层产生 z-order 竞争
            "pointer-events-auto flex w-full max-w-[1120px] flex-col overflow-hidden rounded-[24px] border border-transparent md:rounded-full [transform:translateZ(0)]",
            // mounted 后才开启内层过渡；backdrop-filter 不参与过渡，避免合成层振荡
            mounted && "transition-[background,border-color,box-shadow] duration-300 ease-out",
            isGlass &&
              "border-[var(--glass-bdr)] bg-[var(--glass-bg)] shadow-[0_0_0_1px_var(--glass-ring),0_4px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)]",
          )}
        >
          <NavbarMobileHeader
            mobileVariant={navbarContext.mobileVariant}
            title={navbarContext.title}
            isGlass={isGlass}
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((open) => !open)}
          />

          <div className="hidden min-h-0 items-center justify-between px-4 py-[9px] md:flex">
            <NavbarLogo isGlass={isGlass} />

            <div className="absolute left-1/2 -translate-x-1/2">
              <NavbarLinks isGlass={isGlass} />
            </div>

            <div className="items-center gap-1">
              <NavbarActions isGlass={isGlass} />
            </div>
          </div>

          <NavbarMobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
      </nav>
    </>
  );
}
