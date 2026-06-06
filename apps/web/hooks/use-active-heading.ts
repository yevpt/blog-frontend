"use client";

/* global document, window */
import { useState, useEffect } from "react";

const OFFSET = 120; // navbar 高度 + 缓冲，低于此值视为"已滚过"

export function useActiveHeading(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId(ids[0]);

    const update = () => {
      if (window.scrollY <= 0) {
        setActiveId(ids[0]);
        return;
      }
      let active = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop - window.scrollY <= OFFSET) {
          active = id;
        }
      }
      setActiveId(active);
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [ids]);

  return activeId;
}
