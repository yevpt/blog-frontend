import type { Metadata } from "next";
import type { CategoryTabsResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { CategoriesPage } from "@/components/categories";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = {
  title: "分类 | Yevpt's Blog",
  description: "按主题浏览所有文章分类",
};

const EMPTY_CATEGORIES: CategoryTabsResp = { list: [] };

export default async function CategoriesPageRoute() {
  const api = await createServerApiClient();
  const resp = await api.categories.listTabs().catch(() => EMPTY_CATEGORIES);

  return (
    <PageContainer>
      <CategoriesPage categories={resp.list} />
    </PageContainer>
  );
}
