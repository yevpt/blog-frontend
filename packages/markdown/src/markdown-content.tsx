import clsx from "clsx";

export interface MarkdownContentProps {
  /** 已由 markdownToHtml 渲染好的 HTML 字符串 */
  html: string;
  /**
   * 渲染风格：
   *  - article（默认）：文章正文，全尺寸 prose，保持与现有 ArticleContent 一致的样式
   *  - comment：评论紧凑模式，prose-sm + 收紧间距；
   *             注意：不使用 inline 类 —— 旧 MarkdownText 误用 inline 导致块级元素布局崩溃
   */
  variant?: "article" | "comment";
  /** 追加到根元素的自定义类名 */
  className?: string;
}

const VARIANT_CLASSES: Record<"article" | "comment", string> = {
  // 文章正文：全尺寸 prose，颜色 neutral，深色模式反色
  article: "prose prose-neutral max-w-none dark:prose-invert",
  // 评论：prose-sm 缩小字号；段落、标题、列表、代码均收紧间距
  comment: [
    "prose prose-sm dark:prose-invert max-w-none",
    "prose-p:my-0.5 prose-p:leading-relaxed",
    "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5",
    "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
    "prose-blockquote:my-1 prose-pre:my-1 prose-code:text-xs",
  ].join(" "),
};

export function MarkdownContent({ html, variant = "article", className }: MarkdownContentProps) {
  return (
    <div
      className={clsx(VARIANT_CLASSES[variant], className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
