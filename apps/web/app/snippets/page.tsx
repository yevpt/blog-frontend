import type { Metadata } from "next";
import type { MomentPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { SnippetsListLoader } from "@/components/snippets/snippets-list-loader";
import { WriteSnippetButton } from "@/components/snippets/write-snippet-button";
import { PageContainer } from "@/components/common/page-container";

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
    .feed({ scope: "all", sort: "latest", page: 1, page_size: 20 })
    .catch(() => EMPTY_MOMENTS);

  return (
    <PageContainer size="default">
      <SnippetsListLoader initialPage={momentsPage} />
      <div className="pointer-events-none absolute inset-x-5 bottom-6 top-0 z-40 md:bottom-10">
        <div className="sticky top-[calc(100dvh-4rem)] flex justify-end md:top-[calc(100dvh-5.5rem)]">
          <WriteSnippetButton />
        </div>
      </div>
    </PageContainer>
  );
}
