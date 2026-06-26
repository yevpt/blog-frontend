import { PreviewableMarkdown } from "@/components/common/previewable-markdown";

interface ArticleContentProps {
  contentHtml: string;
}

export function ArticleContent({ contentHtml }: ArticleContentProps) {
  return (
    <article className="mx-auto max-w-[720px] px-2 pt-4 pb-10 md:px-0">
      <PreviewableMarkdown html={contentHtml} variant="article" />
    </article>
  );
}
