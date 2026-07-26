import type { Metadata } from "next";
import type { ArticleListItemResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { ArchivePage } from "@/components/archive";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = {
  title: "归档 | Yevpt's Blog",
  description: "按时间回顾所有文章",
};

const ARCHIVE_PAGE_SIZE = 50;

/** 拉取全部公开文章（按发布时间倒序），接口异常时降级为空列表 */
async function fetchAllPublicArticles(): Promise<ArticleListItemResp[]> {
  const api = await createServerApiClient();
  const loadPage = (page: number) =>
    api.articles.listPublic({
      page,
      page_size: ARCHIVE_PAGE_SIZE,
      sort_by: "created_at",
      sort_order: "desc",
    });

  try {
    const firstPage = await loadPage(1);
    if (firstPage.pages <= 1) return firstPage.list;

    const restPages = await Promise.all(
      Array.from({ length: firstPage.pages - 1 }, (_, index) => loadPage(index + 2)),
    );
    return firstPage.list.concat(restPages.flatMap((page) => page.list));
  } catch {
    return [];
  }
}

export default async function ArchivePageRoute() {
  const articles = await fetchAllPublicArticles();

  return (
    <PageContainer>
      <ArchivePage articles={articles} />
    </PageContainer>
  );
}
