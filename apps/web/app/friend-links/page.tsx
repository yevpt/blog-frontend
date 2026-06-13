import type { Metadata } from "next";
import type { FriendLinkItemResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { FriendLinksPage } from "@/components/friend-links";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = {
  title: "友邻 | Yevpt's Blog",
  description: "一些有趣的友邻，欢迎交换友链",
};

const EMPTY_LIST: FriendLinkItemResp[] = [];

export default async function FriendLinksPageRoute() {
  const api = await createServerApiClient();
  const resp = await api.friendLinks
    .listPublic({ page: 1, page_size: 50 })
    .catch(() => ({ list: EMPTY_LIST }));

  return (
    <PageContainer>
      <FriendLinksPage links={resp.list} />
    </PageContainer>
  );
}
