"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@repo/ui";
import { useActiveHeading } from "@/hooks/use-active-heading";
import type { TocItem } from "@/lib/markdown";

interface ArticleTocProps {
  items: TocItem[];
  variant?: "mobile" | "desktop";
}

export function ArticleToc({ items, variant }: ArticleTocProps) {
  const ids = items.map((i) => i.id);
  const activeId = useActiveHeading(ids);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  // activeId 变化时，将对应 TOC 条目滚动进 nav 可视区
  useEffect(() => {
    if (!navRef.current || !activeId || pendingId !== null) return;
    const el = navRef.current.querySelector<HTMLElement>(`[data-heading-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId, pendingId]);

  if (items.length < 2) return null;

  const displayedActiveId = pendingId ?? activeId;

  const list = (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li
          key={item.id}
          data-heading-id={item.id}
          style={{ paddingLeft: item.level === 3 ? "12px" : "0" }}
        >
          <Button
            variant="ghost"
            onPress={() => handleClick(item.id)}
            className={`h-auto w-full justify-start rounded px-2 py-1.5 text-left text-xs leading-snug hover:bg-transparent data-[pressed]:scale-100 ${
              displayedActiveId === item.id
                ? "font-semibold text-primary hover:text-primary"
                : "font-normal text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.text}
          </Button>
        </li>
      ))}
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
          className="sticky top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto rounded-lg p-2"
        >
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            目录
          </p>
          {list}
        </nav>
      )}
      {showMobile && (
        <details className="mb-6 rounded-lg bg-card shadow-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
            目录
          </summary>
          <div className="px-4 pb-4 pt-2">{list}</div>
        </details>
      )}
    </>
  );
}
