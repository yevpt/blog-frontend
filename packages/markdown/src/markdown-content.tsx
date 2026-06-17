"use client";

import { useRef, useEffect } from "react";
import clsx from "clsx";

export interface MarkdownContentProps {
  /** 已由 markdownToHtml 渲染好的 HTML 字符串 */
  html: string;
  /**
   * 渲染风格：
   *  - article（默认）：文章正文，全尺寸 prose，保持与现有 ArticleContent 一致的样式
   *  - comment：评论紧凑模式，prose-sm + 收紧间距
   */
  variant?: "article" | "comment";
  /** 追加到根元素的自定义类名 */
  className?: string;
}

const VARIANT_CLASSES: Record<"article" | "comment", string> = {
  article: "prose prose-neutral max-w-none dark:prose-invert",
  comment: [
    "prose prose-sm dark:prose-invert max-w-none",
    "prose-p:my-0.5 prose-p:leading-relaxed",
    "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5",
    "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
    "prose-blockquote:my-1 prose-pre:my-1 prose-code:text-xs",
    "prose-img:max-w-[240px] prose-img:rounded-md",
    "prose-pre:bg-[var(--editor-code-bg)] prose-pre:text-[var(--editor-code-fg)]",
    "prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:rounded-lg",
    "prose-code:text-[var(--editor-code-fg)]",
  ].join(" "),
};

// 复制成功后显示的勾图标（绿色），2 秒后恢复
const CHECKMARK_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

export function MarkdownContent({ html, variant = "article", className }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = container.querySelectorAll<HTMLButtonElement>(".md-copy-btn");
    const cleanups: Array<() => void> = [];

    buttons.forEach((btn) => {
      const wrapper = btn.closest(".md-code-wrapper");
      if (!wrapper) return;
      const code = wrapper.querySelector("pre > code");
      if (!code) return;

      const originalHTML = btn.innerHTML;

      const handleClick = () => {
        const text = code.textContent ?? "";
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = CHECKMARK_SVG;
          btn.style.color = "rgb(22, 163, 74)";
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = "";
          }, 2000);
        });
      };

      btn.addEventListener("click", handleClick);
      cleanups.push(() => btn.removeEventListener("click", handleClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={clsx(VARIANT_CLASSES[variant], className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
