"use client";

import { useLocale } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import type { Tag } from "../../app/_mock/types";

interface TagsCloudProps {
  tags: Tag[];
}

export function TagsCloud({ tags }: TagsCloudProps) {
  const { t } = useLocale();

  return (
    <section className="rounded-xl border border-border/50 p-4 mt-4">
      <h3 className="text-sm font-semibold mb-3">{t("sidebar.tags")}</h3>

      {/* flex wrap 标签云 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            className="flex items-center gap-1.5 px-3 py-1.5
                       rounded-full text-xs font-medium
                       bg-secondary text-secondary-foreground
                       hover:bg-secondary/80 transition-colors duration-200"
          >
            <SvgIcon name={tag.icon} size={12} />
            <span>{tag.name}</span>
            <span className="ml-1 text-muted-foreground">{tag.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
