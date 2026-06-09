import type { Metadata } from "next";
import type { MomentPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { SnippetsListLoader } from "@/components/snippets/snippets-list-loader";

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
  const ownerUserId = Number(process.env.BLOG_USER_ID) || undefined;
  const friendRoleId = Number(process.env.BLOG_FRIEND_ROLE_ID) || undefined;
  const momentsPage = await api.moments
    .listPublic({ page: 1, page_size: 20 })
    .catch(() => EMPTY_MOMENTS);

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-20 pt-20 md:pt-24">
      <SnippetsListLoader
        initialPage={momentsPage}
        ownerUserId={ownerUserId}
        friendRoleId={friendRoleId}
      />
    </div>
  );
}
