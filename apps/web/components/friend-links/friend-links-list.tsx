"use client";

import { useEffect, useRef } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { FriendLinkCard } from "./friend-link-card";

interface FriendLinksListProps {
  links: FriendLinkItemResp[];
}

const MAX_STAGGER_DELAY = 450;

export function FriendLinksList({ links }: FriendLinksListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll<HTMLElement>("[data-animate-item]"));

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting);
        entering.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.animationDelay = `${Math.min(i * 50, MAX_STAGGER_DELAY)}ms`;
          el.classList.remove("opacity-0");
          el.classList.add("animate-fade-in-up");
          observer.unobserve(el);
        });
      },
      { threshold: 0.1 },
    );

    items.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      items.forEach((el) => {
        el.classList.remove("animate-fade-in-up");
        el.classList.add("opacity-0");
        el.style.animationDelay = "";
      });
    };
  }, []);

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {links.map((link) => (
        <div key={link.id} data-animate-item className="opacity-0">
          <FriendLinkCard link={link} />
        </div>
      ))}
    </div>
  );
}
