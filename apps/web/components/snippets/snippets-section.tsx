"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import type { MomentItemResp } from "@repo/api";
import { SnippetCard } from "./snippet-card";

interface SnippetsSectionProps {
  snippets: MomentItemResp[];
}

/** 右侧栏最多展示的碎语条数 */
const MAX_SNIPPETS = 3;

// 碎语区块容器：标题 + 卡片网格 + 操作按钮
// 因为使用了 useLocale 需要标记 'use client'
export function SnippetsSection({ snippets }: SnippetsSectionProps) {
  const { t } = useLocale();
  const visibleSnippets = snippets.slice(0, MAX_SNIPPETS);

  return (
    <section className="rounded-[14px] border border-border bg-card px-[10px] py-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-(--fg3)">
        {t("home.snippets")}
      </h3>

      <div className="flex flex-col">
        {visibleSnippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full text-[11px]">
          {t("snippet.postNew")}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 flex-1 rounded-full text-[11px]">
          {t("snippet.viewMore")}
        </Button>
      </div>
    </section>
  );
}
