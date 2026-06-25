"use client";

import type { TagItemResp } from "@repo/api";
import { useLocale } from "@repo/hooks";
import { TagGroup, TagList, TagItem } from "@repo/ui";
import { SidebarSectionHeader } from "@/components/sidebar";

interface TagsCloudProps {
  tags: TagItemResp[];
}

export function TagsCloud({ tags }: TagsCloudProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-2xl bg-card shadow-card">
      <SidebarSectionHeader title={t("sidebar.tags")} />

      <div className="px-4 pb-4">
        <TagGroup aria-label={t("sidebar.tags")} selectionMode="none">
          <TagList className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagItem
                key={tag.id}
                id={String(tag.id)}
                textValue={`${tag.name} ${tag.article_count}`}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:border-primary"
              >
                {tag.name}
                <span className="ml-1 text-[10px] opacity-60">{tag.article_count}</span>
              </TagItem>
            ))}
          </TagList>
        </TagGroup>
      </div>
    </section>
  );
}
