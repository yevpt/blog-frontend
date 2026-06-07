"use client";

import { useLocale } from "@repo/hooks";
import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import type { MomentItemResp } from "@repo/api";
import { SnippetCard } from "./snippet-card";

interface SnippetsSectionProps {
  snippets: MomentItemResp[];
}

/** 右侧栏最多展示的碎语条数 */
const MAX_SNIPPETS = 3;

// 碎语区块容器：渐变图标 header + 卡片堆叠 + 渐变 CTA 按钮
export function SnippetsSection({ snippets }: SnippetsSectionProps) {
  const { t } = useLocale();
  const visibleSnippets = snippets.slice(0, MAX_SNIPPETS);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary/80 text-[13px] text-primary-foreground">
            ✦
          </div>
          <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">
            {t("home.snippets")}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="随机换一批"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] border border-border p-0 text-(--fg3) transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          <SvgIcon name="shuffle" size={16} />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-3 pb-3">
        {visibleSnippets.map((snippet) => (
          <SnippetCard key={snippet.id} snippet={snippet} />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="flex gap-2 border-t border-border/40 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-xs font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.25)] hover:opacity-90 border-none"
        >
          {t("snippet.postNew")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 flex-1 rounded-xl border border-border/60 text-xs font-medium text-(--fg2) hover:border-primary/30 hover:text-primary"
        >
          {t("snippet.viewMore")} →
        </Button>
      </div>
    </section>
  );
}
