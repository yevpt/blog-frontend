"use client";

import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";
import type { Snippet } from "../../app/_mock/types";
import { SnippetCard } from "./snippet-card";

interface SnippetsSectionProps {
  snippets: Snippet[];
}

// 碎语区块容器：标题 + 卡片网格 + 操作按钮
// 因为使用了 useLocale 需要标记 'use client'
export function SnippetsSection({ snippets }: SnippetsSectionProps) {
  const { t } = useLocale();

  return (
    <section>
      <h2 className="text-lg font-semibold">{t("home.snippets")}</h2>

      {/* 卡片网格：移动端单列，md 以上双列 */}
      <div className="grid grid-cols-1 gap-4 mt-4">
        {snippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-3 mt-6 justify-center">
        <Button variant="outline">{t("snippet.postNew")}</Button>
        <Button variant="ghost">{t("snippet.viewMore")}</Button>
      </div>
    </section>
  );
}
