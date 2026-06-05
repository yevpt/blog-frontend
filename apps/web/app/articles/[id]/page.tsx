import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { markdownToHtml, extractTocFromHtml } from "@/lib/markdown";
import {
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

  return (
    <>
      <ArticleHero article={article} />

      <div className="mx-auto max-w-[1100px] px-5 py-8">
        {/* 正文 + 右侧 sticky TOC 双列（mobile 单列，xl+ 双列） */}
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_200px]">
          <div className="min-w-0">
            {/* mobile 折叠手风琴（xl 以上自行隐藏）*/}
            <ArticleToc items={tocItems} variant="mobile" />
            <ArticleContent contentHtml={contentHtml} />
            <ArticleComments articleId={article.id} commentCount={article.comment_count} />
          </div>
          {/* desktop sticky TOC（mobile 自行隐藏）*/}
          <aside className="hidden xl:block">
            <ArticleToc items={tocItems} variant="desktop" />
          </aside>
        </div>
      </div>

      <ArticleFloatActions
        articleId={article.id}
        initialLikeCount={article.like_count}
        initialIsLiked={article.is_liked ?? false}
        musicUrl={article.music_url}
        musicName={article.music_name}
      />
    </>
  );
}
