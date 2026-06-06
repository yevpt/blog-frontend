"use client";

import { useState } from "react";
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
  const [collapsed, setCollapsed] = useState(false);

  if (items.length < 2) return null;

  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const list = (
    <ul className="space-y-0.5 text-sm">
      {items.map((item) => (
        <li key={item.id} style={{ paddingLeft: item.level === 3 ? "12px" : "0" }}>
          <Button
            variant="ghost"
            onPress={() => handleClick(item.id)}
            className={`w-full rounded px-2 py-1 text-left transition-colors hover:text-primary ${
              activeId === item.id ? "font-semibold text-primary" : "text-muted-foreground"
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
          aria-label="文章目录"
          className="sticky top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto rounded-lg border border-border bg-card p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              目录
            </p>
            <Button
              variant="ghost"
              onPress={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "展开目录" : "收起目录"}
              className="cursor-pointer rounded p-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {collapsed ? "▶" : "▼"}
            </Button>
          </div>
          {!collapsed && list}
        </nav>
      )}
      {showMobile && (
        <details className="mb-6 rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
            目录
          </summary>
          <div className="px-4 pb-4 pt-2">{list}</div>
        </details>
      )}
    </>
  );
}
