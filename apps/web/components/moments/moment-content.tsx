"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@repo/hooks";
import { markdownToHtmlSync } from "@repo/markdown";
import { Button } from "@repo/ui";
import { PreviewableMarkdown } from "@/components/common/previewable-markdown";

interface MomentContentProps {
  content: string;
  /**
   * 是否允许折叠长文本并显示展开/收起按钮。
   * 首页内嵌条目需要 true，碎语独立页完整展示传 false。默认 true。
   */
  collapsible?: boolean;
}

// 超过此字符数时显示展开按钮
const MAX_CHARS = 120;

// 正文截断 + 展开/收起，纯客户端交互组件
export function MomentContent({ content, collapsible = true }: MomentContentProps) {
  const { t } = useLocale();
  const isLong = collapsible && content.length > MAX_CHARS;
  const [expanded, setExpanded] = useState(false);

  // 未展开时截断到 MAX_CHARS 并加省略号
  const displayText = isLong && !expanded ? content.slice(0, MAX_CHARS) + "..." : content;
  const html = useMemo(() => markdownToHtmlSync(displayText), [displayText]);

  return (
    <div className="mt-0.5 text-[13px] leading-relaxed text-(--fg2)">
      <PreviewableMarkdown html={html} variant="comment" className="break-words" />
      {isLong && (
        <Button
          variant="text"
          onPress={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs transition-colors"
        >
          {expanded ? t("moment.collapse") : t("moment.expand")}
        </Button>
      )}
    </div>
  );
}
