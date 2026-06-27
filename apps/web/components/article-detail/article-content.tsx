import { MarkdownStatic } from "@repo/markdown";
import { ArticleMarkdownEffects, ARTICLE_MARKDOWN_CONTENT_ID } from "./article-markdown-effects";

interface ArticleContentProps {
  contentHtml: string;
}

/** 文章正文：服务端输出带骨架的 HTML，客户端挂载预览/复制/懒加载等增强。 */
export function ArticleContent({ contentHtml }: ArticleContentProps) {
  return (
    <article className="mx-auto max-w-[720px] px-2 pt-4 pb-10 md:px-0">
      <MarkdownStatic
        html={contentHtml}
        variant="article"
        contentId={ARTICLE_MARKDOWN_CONTENT_ID}
        previewable
      />
      <ArticleMarkdownEffects />
    </article>
  );
}
