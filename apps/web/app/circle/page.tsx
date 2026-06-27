import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { CircleList } from "./_components/circle-list";
import { PageContainer } from "@/components/common/page-container";
import { CIRCLE_PAGE_SIZE, sortCircleUsers } from "./_components/circle-grid";

export const metadata: Metadata = {
  title: "圈子 | Yevpt's Blog",
  description: "看看都有谁在这里出没",
};

export default async function CirclePage() {
  const api = await createServerApiClient();
  const usersPage = await api.users
    .listPublic({ page: 1, page_size: CIRCLE_PAGE_SIZE })
    .catch((err) => {
      console.error("Failed to fetch users:", err);
      return { list: [], total: 0, pages: 0, page: 1, page_size: CIRCLE_PAGE_SIZE };
    });

  const initialPage = { ...usersPage, list: sortCircleUsers(usersPage.list) };

  return (
    <PageContainer size="default">
      <CircleList initialPage={initialPage} />
    </PageContainer>
  );
}
