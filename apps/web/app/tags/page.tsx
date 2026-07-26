import type { Metadata } from "next";
import type { TagListResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { TagsPage } from "@/components/tags";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = {
  title: "标签 | Yevpt's Blog",
  description: "按标签浏览所有文章",
};

const EMPTY_TAGS: TagListResp = { list: [] };

export default async function TagsPageRoute() {
  const api = await createServerApiClient();
  const resp = await api.tags.list().catch(() => EMPTY_TAGS);

  return (
    <PageContainer>
      <TagsPage tags={resp.list} />
    </PageContainer>
  );
}
