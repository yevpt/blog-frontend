"use client";

import { useState } from "react";
import { useLocale } from "@repo/hooks";
import { Button } from "@repo/ui";

interface SnippetContentProps {
  content: string;
}

// 超过此字符数时显示展开按钮
const MAX_CHARS = 120;

// 正文截断 + 展开/收起，纯客户端交互组件
export function SnippetContent({ content }: SnippetContentProps) {
  const { t } = useLocale();
  const isLong = content.length > MAX_CHARS;
  const [expanded, setExpanded] = useState(false);

  // 未展开时截断到 MAX_CHARS 并加省略号
  const displayText = isLong && !expanded ? content.slice(0, MAX_CHARS) + "..." : content;

  return (
    <div className="mt-1">
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-(--fg2)">{displayText}</p>
      {isLong && (
        <Button
          variant="ghost"
          onPress={() => setExpanded((prev) => !prev)}
          className="mt-1 cursor-pointer text-xs text-primary/70 transition-colors hover:text-primary"
        >
          {expanded ? t("snippet.collapse") : t("snippet.expand")}
        </Button>
      )}
    </div>
  );
}
