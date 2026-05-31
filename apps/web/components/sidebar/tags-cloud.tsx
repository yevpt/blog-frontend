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
    <section className="rounded-xl border border-border/50 p-4 mt-4">
      <TagGroup label={t("sidebar.tags")} selectionMode="none">
        <TagList>
          {tags.map((tag) => (
            <TagItem key={tag.id} id={tag.id} count={tag.count}>
              {tag.name}
            </TagItem>
          ))}
        </TagList>
      </TagGroup>
    </section>
  );
}
