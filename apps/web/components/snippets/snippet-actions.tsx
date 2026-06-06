"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { useLocale } from "@repo/hooks";

// 操作按钮：喜欢、评论（当前为静态 mock 交互）
export function SnippetActions() {
  const { t } = useLocale();
  const [liked, setLiked] = useState(false);

  return (
    <div className="flex gap-0.5">
      <button
        onClick={() => setLiked((prev) => !prev)}
        className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
          liked ? "text-red-500" : "text-[var(--fg3)] hover:bg-primary/10 hover:text-primary"
        }`}
        aria-label={t("snippet.like")}
      >
        <SvgIcon name="heart" size={14} />
        {t("snippet.like")}
      </button>

      <button
        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--fg3)] transition-colors hover:bg-primary/10 hover:text-primary"
        aria-label={t("snippet.comment")}
      >
        <SvgIcon name="message-circle" size={14} />
        {t("snippet.comment")}
      </button>
    </div>
  );
}
