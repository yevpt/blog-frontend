import type { Metadata } from "next";
import type { MomentPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { SnippetCard } from "@/components/snippets/snippet-card";

export const metadata: Metadata = {
  title: "碎语 | Yevpt's Blog",
  description: "生活、思考与随笔的碎碎念",
};

const EMPTY_MOMENTS: MomentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 20,
  list: [],
};

export default async function SnippetsPage() {
  const api = await createServerApiClient();
  const momentsPage = await api.moments
    .listPublic({ page: 1, page_size: 20, user_id: Number(process.env.BLOG_USER_ID) })
    .catch(() => EMPTY_MOMENTS);

  return (
    <div className="mx-auto max-w-[640px] px-5 pb-20 pt-16 md:pt-24">
      <h1 className="mb-6 text-2xl font-bold">碎语</h1>
      <div className="flex flex-col gap-2.5">
        {momentsPage.list.length > 0 ? (
          momentsPage.list.map((snippet) => <SnippetCard key={snippet.id} snippet={snippet} />)
        ) : (
          <p className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-(--fg3)">
            暂无碎语
          </p>
        )}
      </div>
    </div>
  );
}
