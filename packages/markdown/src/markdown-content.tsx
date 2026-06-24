"use client";

import { useRef, useEffect } from "react";
import clsx from "clsx";
import { attachMarkdownImageFallbacks, MD_IMAGE_FALLBACK_CLASS } from "./image-fallback";
import { PROSE_BLOCKQUOTE_QUOTELESS_CLASSES } from "./prose-blockquote-classes";

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
  /** 点击正文图片时回调（已渲染的原生 img 用事件委托捕获）。 */
  onImagePreview?: (images: { src: string; alt?: string }[], index: number) => void;
  /**
   * 图片加载失败时展示占位图标；comment 模式默认开启。
   * 无效 src 需在渲染前通过 stripInvalidImages 预处理。
   */
  imageErrorFallback?: boolean;
}

const IMAGE_FALLBACK_VARIANT_CLASSES = [
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:inline-flex`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:items-center`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:justify-center`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:size-12`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:rounded-md`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:border`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:border-dashed`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:border-border/80`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:bg-muted/80`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:text-muted-foreground`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:align-middle`,
].join(" ");

const ARTICLE_PROSE_RHYTHM_CLASSES = [
  "prose-p:leading-[1.85]",
  "prose-h1:mt-[1.25em] prose-h1:mb-[0.65em]",
  "prose-h2:mt-[1.35em] prose-h2:mb-[0.65em]",
  "prose-h3:mt-[1.25em] prose-h3:mb-[0.55em]",
  // code block 被 rehype 包成 div，不能再依赖 typography 的 pre 外边距。
  "[&_.md-code-wrapper]:my-8 [&_.md-code-wrapper:first-child]:mt-0 [&_.md-code-wrapper:last-child]:mb-0",
].join(" ");

const VARIANT_CLASSES: Record<"article" | "comment", string> = {
  article: [
    "prose prose-neutral max-w-none dark:prose-invert",
    ARTICLE_PROSE_RHYTHM_CLASSES,
    PROSE_BLOCKQUOTE_QUOTELESS_CLASSES,
  ].join(" "),
  comment: [
    "prose prose-sm dark:prose-invert max-w-none",
    PROSE_BLOCKQUOTE_QUOTELESS_CLASSES,
    "prose-p:my-0.5 prose-p:leading-relaxed",
    "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5",
    "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
    "prose-blockquote:my-2 prose-code:text-xs",
    // 代码块被 .md-code-wrapper 包裹，且内部 pre 被 base.css 用 margin:0!important 锁死，
    // 故间距只能加在 wrapper 本身（仅评论紧凑模式需要，文章正文靠段落大边距已足够）。
    // 首/尾代码块的外边距对齐段落（prose-p:my-0.5），否则会顶飞「回复」按钮造成上下间距失衡。
    "[&_.md-code-wrapper]:my-2.5 [&_.md-code-wrapper:first-child]:mt-0.5 [&_.md-code-wrapper:last-child]:mb-0.5",
    "prose-img:max-w-[240px] prose-img:rounded-md",
    IMAGE_FALLBACK_VARIANT_CLASSES,
    "prose-pre:bg-[var(--md-code-bg)] prose-pre:text-[var(--editor-code-fg)]",
    "prose-pre:border prose-pre:border-[var(--md-code-border)] prose-pre:rounded-lg",
    "prose-code:text-[var(--editor-code-fg)]",
  ].join(" "),
};

// 复制成功后显示的勾图标（绿色），2 秒后恢复
const CHECKMARK_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

export function MarkdownContent({
  html,
  variant = "article",
  className,
  onImagePreview,
  imageErrorFallback = variant === "comment",
}: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 用事件委托绑在稳定的 container 上，避免 dangerouslySetInnerHTML 替换 innerHTML 后旧节点失效
    const handleClick = (event: MouseEvent) => {
      // 图片预览：点击正文 <img> 收集同容器全部图片
      const img = (event.target as Element).closest<HTMLImageElement>("img");
      if (img && onImagePreview) {
        const all = Array.from(container.querySelectorAll("img"));
        const items = all.map((el) => ({
          src: el.currentSrc || el.src,
          alt: el.alt || undefined,
        }));
        const index = all.indexOf(img);
        if (index >= 0) onImagePreview(items, index);
        return;
      }

      const btn = (event.target as Element).closest<HTMLButtonElement>(".md-copy-btn");
      if (!btn) return;
      const wrapper = btn.closest(".md-code-wrapper");
      if (!wrapper) return;
      const code = wrapper.querySelector("pre > code");
      if (!code) return;

      const originalHTML = btn.innerHTML;
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

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [onImagePreview]);

  useEffect(() => {
    if (!imageErrorFallback) return;
    const container = containerRef.current;
    if (!container) return;
    attachMarkdownImageFallbacks(container);
  }, [html, imageErrorFallback]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        VARIANT_CLASSES[variant],
        onImagePreview && "[&_img]:cursor-zoom-in",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
