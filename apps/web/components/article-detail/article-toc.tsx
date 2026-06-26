"use client";

import { useRef, useState, useEffect } from "react";
import { Button, cn } from "@repo/ui";
import { useActiveHeading } from "@/hooks/use-active-heading";
import type { TocItem } from "@/lib/markdown";

interface ArticleTocProps {
  items: TocItem[];
  variant?: "mobile" | "desktop";
}

interface TocIndicatorState {
  height: number;
  opacity: number;
  transform: string;
}

const DEFAULT_INDICATOR_HEIGHT = 20;

export function ArticleToc({ items, variant }: ArticleTocProps) {
  const ids = items.map((i) => i.id);
  const activeId = useActiveHeading(ids);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<TocIndicatorState>({
    height: DEFAULT_INDICATOR_HEIGHT,
    opacity: 0,
    transform: "translateY(0px)",
  });
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const displayedActiveId = pendingId ?? activeId;

  // 点击后锁定激活项，直到滚动停止（防止平滑滚动途中乱跳）
  const handleClick = (id: string) => {
    cleanupRef.current?.();
    setPendingId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const safetyTimer = setTimeout(release, 2000);

    function release() {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearTimeout(safetyTimer);
      window.removeEventListener("scroll", onScroll);
      setPendingId(null);
      cleanupRef.current = null;
    }

    function onScroll() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(release, 150);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    cleanupRef.current = release;
  };

  useEffect(() => {
    if (!listRef.current || !displayedActiveId) {
      setIndicator((current) => ({ ...current, opacity: 0 }));
      return;
    }

    const el = listRef.current.querySelector<HTMLElement>(
      `[data-heading-id="${displayedActiveId}"]`,
    );
    if (!el) {
      setIndicator((current) => ({ ...current, opacity: 0 }));
      return;
    }

    const height = Math.max(DEFAULT_INDICATOR_HEIGHT, el.offsetHeight - 8);
    const top = el.offsetTop + (el.offsetHeight - height) / 2;
    setIndicator({
      height,
      opacity: 1,
      transform: `translateY(${top}px)`,
    });

    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const visibleTop = scrollArea.scrollTop;
    const visibleBottom = visibleTop + scrollArea.clientHeight;
    const itemTop = el.offsetTop;
    const itemBottom = itemTop + el.offsetHeight;

    if (itemTop < visibleTop) {
      scrollArea.scrollTo({ top: Math.max(itemTop - 8, 0), behavior: "smooth" });
      return;
    }

    if (itemBottom > visibleBottom) {
      scrollArea.scrollTo({
        top: itemBottom - scrollArea.clientHeight + 8,
        behavior: "smooth",
      });
    }
  }, [displayedActiveId]);

  if (items.length < 2) return null;

  const minLevel = Math.min(...items.map((item) => item.level));

  const renderList = () => (
    <ul
      ref={listRef}
      className="relative space-y-1 border-l border-foreground/8 pl-3 dark:border-foreground/12"
    >
      <span
        aria-hidden="true"
        data-testid="toc-active-indicator"
        className="absolute -left-px top-0 w-0.5 rounded-full bg-foreground transition-transform duration-200 ease-out"
        style={{
          height: `${indicator.height}px`,
          opacity: indicator.opacity,
          transform: indicator.transform,
        }}
      />
      {items.map((item) => {
        const isActive = displayedActiveId === item.id;
        const visualDepth = item.level - minLevel;

        return (
          <li
            key={item.id}
            data-heading-id={item.id}
            className="relative"
            style={{ paddingLeft: `${visualDepth * 12}px` }}
          >
            <Button
              variant="text"
              aria-current={isActive ? "location" : undefined}
              onPress={() => handleClick(item.id)}
              className={cn(
                "h-auto min-h-8 w-full justify-start rounded-md px-2 py-1.5 text-left text-xs leading-snug transition-colors data-[pressed]:scale-100",
                isActive
                  ? "font-normal text-foreground hover:text-foreground"
                  : "font-normal text-muted-foreground hover:text-foreground",
              )}
            >
              {item.text}
            </Button>
          </li>
        );
      })}
    </ul>
  );

  const showDesktop = !variant || variant === "desktop";
  const showMobile = !variant || variant === "mobile";

  return (
    <>
      {showDesktop && (
        <nav
          ref={navRef}
          aria-label="文章目录"
          className="sticky top-[88px] flex max-h-[calc(100vh-108px)] flex-col rounded-lg px-1.5 py-2"
        >
          <p className="shrink-0 pb-2 pl-3 text-[11px] font-medium text-muted-foreground">
            本文目录
          </p>
          <div
            ref={scrollAreaRef}
            data-testid="toc-scroll-area"
            className="min-h-0 overflow-y-auto pr-1"
          >
            {renderList()}
          </div>
        </nav>
      )}
      {showMobile && (
        <details className="mb-6 rounded-lg border border-border bg-card/70 shadow-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
            本文目录
          </summary>
          <div className="px-4 pb-4 pt-1">{renderList()}</div>
        </details>
      )}
    </>
  );
}
