import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { CircleList } from "./_components/circle-list";
import { PageContainer } from "@/components/common/page-container";
import { isAdminUser, isVipUser } from "@/lib/user-roles";

export const metadata: Metadata = {
  title: "圈子 | Yevpt's Blog",
  description: "看看都有谁在这里出没",
};

const PAGE_SIZE = 40;

export default async function CirclePage() {
  const api = await createServerApiClient();
  const usersPage = await api.users.listPublic({ page: 1, page_size: PAGE_SIZE }).catch((err) => {
    console.error("Failed to fetch users:", err);
    return { list: [], total: 0, pages: 0, page: 1, page_size: PAGE_SIZE };
  });

  // 去重
  const uniqueList = [...new Map(usersPage.list.map((u) => [u.id, u])).values()];

  const sortedList = [...uniqueList].sort((a, b) => {
    const aAdmin = isAdminUser(a.roles) ? 1 : 0;
    const bAdmin = isAdminUser(b.roles) ? 1 : 0;
    if (aAdmin !== bAdmin) return bAdmin - aAdmin;
    const aVip = isVipUser(a.roles) ? 1 : 0;
    const bVip = isVipUser(b.roles) ? 1 : 0;
    return bVip - aVip;
  });

  const initialPage = { ...usersPage, list: sortedList };

  return (
    <PageContainer size="default">
      <CircleList initialPage={initialPage} />
    </PageContainer>
  );
}
