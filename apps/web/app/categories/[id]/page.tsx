import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ArticlePageResp, CategoryTabItem, CategoryTabsResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { getCanonicalUrl } from "@/lib/seo";
import { ArticleSection } from "@/components/articles";
import { CategoryDetailHeader } from "@/components/categories";
import { PageContainer } from "@/components/common/page-container";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EMPTY_PAGE: ArticlePageResp = { total: 0, pages: 0, page: 1, page_size: 10, list: [] };

/** 分类列表是公开数据，详情页与 feed.xml 同口径：从 listTabs 中按 id 查找 */
async function fetchCategory(id: number): Promise<CategoryTabItem | null> {
  const api = await createServerApiClient();
  const resp: CategoryTabsResp = await api.categories.listTabs().catch(() => ({ list: [] }));
  return resp.list.find((c) => c.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { title: "分类 | Yevpt's Blog" };
  }

  const category = await fetchCategory(categoryId);
  if (!category) {
    return { title: "分类 | Yevpt's Blog" };
  }

  const description = category.description ?? `${category.name} 分类下的文章`;
  return {
    title: `${category.name} | Yevpt's Blog`,
    description,
    alternates: {
      canonical: getCanonicalUrl(`/categories/${category.id}`).toString(),
    },
    openGraph: {
      title: category.name,
      description,
      type: "website",
      images: category.cover_img_url ? [category.cover_img_url] : undefined,
    },
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const categoryId = Number(id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) notFound();

  const category = await fetchCategory(categoryId);
  if (!category) notFound();

  const api = await createServerApiClient();
  const initialPage = await api.articles
    .listPublic({ page: 1, category_id: categoryId })
    .catch(() => EMPTY_PAGE);

  return (
    <PageContainer>
      <CategoryDetailHeader category={category} />
      <ArticleSection initialPage={initialPage} currentCategoryId={categoryId} />
    </PageContainer>
  );
}
