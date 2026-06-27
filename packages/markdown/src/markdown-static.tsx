import clsx from "clsx";
import { MARKDOWN_VARIANT_CLASSES } from "./markdown-content-classes";

export interface MarkdownStaticProps {
  /** 服务端已渲染好的 HTML（可含图片骨架包裹） */
  html: string;
  variant?: "article" | "comment";
  className?: string;
  /** 供客户端增强逻辑（预览、复制、重试）定位容器 */
  contentId?: string;
  previewable?: boolean;
}

/** 服务端可直接输出的 Markdown HTML 容器（无客户端 JS 依赖）。 */
export function MarkdownStatic({
  html,
  variant = "article",
  className,
  contentId,
  previewable = false,
}: MarkdownStaticProps) {
  return (
    <div
      id={contentId}
      className={clsx(
        MARKDOWN_VARIANT_CLASSES[variant],
        previewable && "[&_img]:cursor-zoom-in",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
