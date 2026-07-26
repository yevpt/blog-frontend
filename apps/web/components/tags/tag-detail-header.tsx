import Link from "next/link";
import type { TagItemResp } from "@repo/api";
import { FadeInUp } from "@repo/ui";
import { SvgIcon } from "@repo/icons";

interface TagDetailHeaderProps {
  tag: TagItemResp;
}

export function TagDetailHeader({ tag }: TagDetailHeaderProps) {
  return (
    <FadeInUp className="mb-8">
      <Link
        href="/tags"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
      >
        <SvgIcon name="arrow-back" size={13} />
        全部标签
      </Link>

      {/* 标题行横排：# + 名称 + 计数居左，订阅居右，与分类详情页同一节奏 */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
            <span className="mr-0.5 text-primary">#</span>
            {tag.name}
          </h1>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {tag.article_count} 篇
          </span>
        </div>

        <a
          href={`/tags/${tag.id}/feed.xml`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-primary"
        >
          <SvgIcon name="rss" size={12} />
          订阅
        </a>
      </div>

      {tag.description && (
        <p className="mt-2 text-sm leading-[1.72] text-muted-foreground">{tag.description}</p>
      )}
    </FadeInUp>
  );
}
