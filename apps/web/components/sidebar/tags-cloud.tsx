"use client";

import Link from "next/link";
import type { TagItemResp } from "@repo/api";
import { useLocale } from "@repo/hooks";
import { filterVisibleCategories } from "@/lib/category-tabs";
import { SidebarSectionHeader } from "@/components/sidebar";

interface TagsCloudProps {
  tags: TagItemResp[];
}

export function TagsCloud({ tags }: TagsCloudProps) {
  const { t } = useLocale();
  // 与标签总览页口径一致：空标签不展示
  const visibleTags = filterVisibleCategories(tags);

  return (
    <section className="rounded-2xl bg-card shadow-card">
      <SidebarSectionHeader title={t("sidebar.tags")} />

      <div className="px-4 pb-4">
        <ul className="flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <li key={tag.id}>
              <Link
                href={`/tags/${tag.id}`}
                className="inline-flex items-baseline rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors duration-200 hover:bg-primary/20"
              >
                {tag.name}
                <span className="ml-1 tabular-nums text-[10px] opacity-60">
                  {tag.article_count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
