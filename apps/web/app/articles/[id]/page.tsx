import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { markdownToHtml, extractTocFromHtml } from "@/lib/markdown";
import {
  ArticleNavbarSync,
  ArticleHero,
  ArticleContent,
  ArticleToc,
  ArticleFloatActions,
  ArticleComments,
} from "@/components/article-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const api = await createServerApiClient();
    const article = await api.articles.getDetail(Number(id));
    return {
      title: `${article.title} | Yevpt's Blog`,
      description: article.short_content ?? article.title,
    };
  } catch {
    return { title: "文章 | Yevpt's Blog" };
  }
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const articleId = Number(id);

  if (!Number.isInteger(articleId) || articleId <= 0) notFound();

  const api = await createServerApiClient();
  let article;
  try {
    article = await api.articles.getDetail(articleId);
  } catch {
    notFound();
  }

  const contentHtml = await markdownToHtml(article.content);
  const tocItems = extractTocFromHtml(contentHtml);

  const hasToc = tocItems.length >= 2;

  return (
    <>
      <ArticleNavbarSync
        articleId={article.id}
        likeCount={article.like_count}
        commentCount={article.comment_count}
        isLiked={article.is_liked ?? false}
        readCount={article.read_count}
      />

      <div className="mx-auto max-w-[1100px] px-4 pt-22 pb-8 md:pt-24">
        <div
          className={
            hasToc
              ? "grid grid-cols-1 gap-8 xl:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_280px]"
              : undefined
          }
        >
          <div className="min-w-0">
            <ArticleHero article={article} />
            <ArticleContent contentHtml={contentHtml} />
          </div>
          {hasToc && (
            <aside className="hidden xl:block">
              <ArticleToc items={tocItems} variant="desktop" />
            </aside>
          )}
        </div>
      </div>

      <ArticleComments articleId={article.id} commentCount={article.comment_count} />

      <ArticleFloatActions
        articleId={article.id}
        musicUrl={article.music?.[0]?.url}
        musicName={article.music?.[0]?.name}
      />
    </>
  );
}
