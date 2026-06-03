"use client";

import { useLocale } from "@repo/hooks";
import { TagGroup, TagList, TagItem } from "@repo/ui";
import type { Tag } from "../../app/_mock/types";

interface TagsCloudProps {
  tags: Tag[];
}

export function TagsCloud({ tags }: TagsCloudProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-[14px] border border-border bg-card p-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      <TagGroup label={t("sidebar.tags")} selectionMode="none">
        <TagList className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagItem
              key={tag.id}
              id={tag.id}
              textValue={`${tag.name} ${tag.count}`}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:border-primary"
            >
              {tag.name}
              <span className="ml-1 text-[10px] opacity-60">{tag.count}</span>
            </TagItem>
          ))}
        </TagList>
      </TagGroup>
    </section>
  );
}
