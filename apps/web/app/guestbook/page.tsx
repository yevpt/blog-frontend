import type { Metadata } from "next";
import type { GuestbookPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { GuestbookPage } from "@/components/guestbook";

export const metadata: Metadata = {
  title: "留言板 | Yevpt's Blog",
  description: "欢迎留下你的足迹，或只是打个招呼",
};

const EMPTY_PAGE: GuestbookPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

export default async function GuestbookPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const api = await createServerApiClient();
  const initialPage = await api.guestbook.list({ page, page_size: 10 }).catch(() => EMPTY_PAGE);

  return <GuestbookPage key={initialPage.page} initialPage={initialPage} />;
}
