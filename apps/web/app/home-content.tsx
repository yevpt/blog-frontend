"use client";

import { useState, useMemo } from "react";
import { cn } from "@repo/ui";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import type { Snippet, Visitor, Tag } from "./_mock/types";
import { ArticleSection } from "@/components/articles";
import { SnippetsSection } from "@/components/snippets";
import { RecentVisitors, TagsCloud } from "@/components/sidebar";

const ALL_CATEGORY_ID = 0;
const ALL_CATEGORY: CategoryTabItem = {
  id: ALL_CATEGORY_ID,
  name: "全部",
  seq: -1,
  article_count: 0,
};

interface HomeContentProps {
  initialPage: ArticlePageResp;
  categories: CategoryTabItem[];
  snippets: Snippet[];
  visitors: Visitor[];
  tags: Tag[];
}

export function HomeContent({
  initialPage,
  categories,
  snippets,
  visitors,
  tags,
}: HomeContentProps) {
  const [currentCategoryId, setCurrentCategoryId] = useState(ALL_CATEGORY_ID);

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  return (
    <div className="max-w-[960px] mx-auto px-5 py-9 pb-20">
      {/* 全宽文章区 header：section title + 下划线 tabs，跨越两列上方 */}
      <div className="mb-6">
        <p className="text-[11px] font-bold tracking-[.1em] uppercase text-accent mb-1.5">
          最新文章
        </p>
        <h2
          className="text-[22px] font-extrabold tracking-tight text-foreground mb-5"
          style={{ letterSpacing: "-.03em" }}
        >
          近期在写什么
        </h2>

        {/* 下划线 Tabs：border-bottom 容器 + 每个 tab margin-bottom:-1.5px 覆盖容器边框 */}
        <div
          className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ borderBottom: "1.5px solid var(--color-border)" }}
        >
          {allCategories.map((cat) => {
            const isActive = cat.id === currentCategoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCurrentCategoryId(cat.id)}
                className={cn(
                  "flex-shrink-0 whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors duration-[180ms]",
                  "text-[13px] font-semibold",
                  isActive ? "text-accent" : "text-[var(--fg2)] hover:text-foreground",
                )}
                style={{
                  padding: "9px 18px",
                  borderBottom: isActive
                    ? "2.5px solid var(--color-accent)"
                    : "2.5px solid transparent",
                  marginBottom: "-1.5px",
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 两列区域：文章卡片 + 侧边栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-6 items-start">
        <main className="min-w-0">
          <ArticleSection initialPage={initialPage} currentCategoryId={currentCategoryId} />
        </main>

        <aside className="lg:sticky lg:top-[88px]" id="sidebar">
          <SnippetsSection snippets={snippets} />
          <div className="mt-4">
            <RecentVisitors visitors={visitors} />
          </div>
          <TagsCloud tags={tags} />
        </aside>
      </div>
    </div>
  );
}
