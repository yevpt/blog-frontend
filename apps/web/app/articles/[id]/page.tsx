import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { getCanonicalUrl } from "@/lib/seo";
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
    const canonical = getCanonicalUrl(`/articles/${article.id}`).toString();
    return {
      title: `${article.title} | Yevpt's Blog`,
      description: article.short_content ?? article.title,
      alternates: {
        canonical,
      },
      openGraph: {
        title: article.title,
        description: article.short_content ?? article.title,
        url: canonical,
        type: "article",
        publishedTime: article.created_at,
        modifiedTime: article.updated_at,
        images: article.cover_img_url ? [article.cover_img_url] : undefined,
      },
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
        {hasToc ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-0 xl:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_280px]">
            <div className="min-w-0">
              <ArticleHero article={article} />
              <ArticleContent contentHtml={contentHtml} />
            </div>
            <aside className="hidden xl:block">
              <ArticleToc items={tocItems} variant="desktop" />
            </aside>
            <div className="min-w-0">
              <ArticleComments articleId={article.id} commentCount={article.comment_count} />
            </div>
            {/* 侧栏扩展位：推荐文章等模块 */}
            <aside className="hidden xl:block" data-testid="article-sidebar-slot" />
          </div>
        ) : (
          <div className="min-w-0">
            <ArticleHero article={article} />
            <ArticleContent contentHtml={contentHtml} />
            <ArticleComments articleId={article.id} commentCount={article.comment_count} />
          </div>
        )}
      </div>

      <ArticleFloatActions
        articleId={article.id}
        musicUrl={article.music?.[0]?.url}
        musicName={article.music?.[0]?.name}
      />
    </>
  );
}
