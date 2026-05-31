"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { useLocale } from "@repo/hooks";

// 操作按钮：喜欢、评论、转发（当前为静态 mock 交互）
export function SnippetActions() {
  const { t } = useLocale();
  const [liked, setLiked] = useState(false);

  return (
    <div className="flex gap-2">
      {/* 喜欢：点击后图标变红 */}
      <button
        onClick={() => setLiked((prev) => !prev)}
        className={`flex items-center gap-1 text-xs transition-colors ${
          liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label={t("snippet.like")}
      >
        <SvgIcon name="heart" size={14} />
        {t("snippet.like")}
      </button>

      {/* 评论 */}
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("snippet.comment")}
      >
        <SvgIcon name="message-circle" size={14} />
        {t("snippet.comment")}
      </button>

      {/* 转发 */}
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("snippet.share")}
      >
        <SvgIcon name="share" size={14} />
        {t("snippet.share")}
      </button>
    </div>
  );
}
