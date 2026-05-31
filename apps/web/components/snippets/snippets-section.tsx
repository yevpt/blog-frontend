"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import type { Snippet } from "../../app/_mock/types";
import { SnippetCard } from "./snippet-card";

interface SnippetsSectionProps {
  snippets: Snippet[];
}

/** 右侧栏最多展示的碎语条数 */
const MAX_SNIPPETS = 3;

// 碎语区块容器：标题 + 卡片网格 + 操作按钮
// 因为使用了 useLocale 需要标记 'use client'
export function SnippetsSection({ snippets }: SnippetsSectionProps) {
  const { t } = useLocale();
  const visibleSnippets = snippets.slice(0, MAX_SNIPPETS);

  return (
    <section className="rounded-xl border border-border/50 p-4">
      <h3 className="text-sm font-semibold mb-3">{t("home.snippets")}</h3>

      <div className="flex flex-col gap-6">
        {visibleSnippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1 text-xs">
          {t("snippet.postNew")}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-xs">
          {t("snippet.viewMore")}
        </Button>
      </div>
    </section>
  );
}
