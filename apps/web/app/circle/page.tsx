import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { CircleList } from "./_components/circle-list";

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
    const aAdmin = a.roles?.includes("admin") ? 1 : 0;
    const bAdmin = b.roles?.includes("admin") ? 1 : 0;
    if (aAdmin !== bAdmin) return bAdmin - aAdmin;
    const aVip = a.roles?.includes("vip") ? 1 : 0;
    const bVip = b.roles?.includes("vip") ? 1 : 0;
    return bVip - aVip;
  });

  const initialPage = { ...usersPage, list: sortedList };

  return (
    <div className="relative mx-auto max-w-[960px] px-5 pb-20 pt-20 md:pt-24">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
        Members
      </p>
      <h1 className="mb-8 text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
        圈子成员
      </h1>

      <CircleList initialPage={initialPage} />
    </div>
  );
}
