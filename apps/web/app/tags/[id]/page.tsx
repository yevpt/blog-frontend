import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ArticlePageResp, TagItemResp, TagListResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { getCanonicalUrl } from "@/lib/seo";
import { ArticleSection } from "@/components/articles";
import { TagDetailHeader } from "@/components/tags";
import { PageContainer } from "@/components/common/page-container";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EMPTY_PAGE: ArticlePageResp = { total: 0, pages: 0, page: 1, page_size: 10, list: [] };

/** 标签列表是公开数据，详情页与 feed.xml 同口径：从 list 中按 id 查找 */
async function fetchTag(id: number): Promise<TagItemResp | null> {
  const api = await createServerApiClient();
  const resp: TagListResp = await api.tags.list().catch(() => ({ list: [] }));
  return resp.list.find((t) => t.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tagId = Number(id);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    return { title: "标签 | Yevpt's Blog" };
  }

  const tag = await fetchTag(tagId);
  if (!tag) {
    return { title: "标签 | Yevpt's Blog" };
  }

  const description = tag.description ?? `#${tag.name} 标签下的文章`;
  return {
    title: `#${tag.name} | Yevpt's Blog`,
    description,
    alternates: {
      canonical: getCanonicalUrl(`/tags/${tag.id}`).toString(),
    },
    openGraph: {
      title: `#${tag.name}`,
      description,
      type: "website",
    },
  };
}

export default async function TagDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tagId = Number(id);

  if (!Number.isInteger(tagId) || tagId <= 0) notFound();

  const tag = await fetchTag(tagId);
  if (!tag) notFound();

  const api = await createServerApiClient();
  const initialPage = await api.articles
    .listPublic({ page: 1, tag_id: tagId })
    .catch(() => EMPTY_PAGE);

  return (
    <PageContainer>
      <TagDetailHeader tag={tag} />
      <ArticleSection initialPage={initialPage} currentTagId={tagId} />
    </PageContainer>
  );
}
