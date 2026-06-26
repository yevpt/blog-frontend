import type { Metadata } from "next";
import type { MomentPageResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { MomentsListLoader } from "@/components/moments/moments-list-loader";
import { MomentsFloatDockSetup } from "@/components/moments/moments-float-dock-setup";
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

export default async function MomentsPage() {
  const api = await createServerApiClient();
  const momentsPage = await api.moments
    .feed({ scope: "all", sort: "latest", page: 1, page_size: 20 })
    .catch(() => EMPTY_MOMENTS);

  return (
    <PageContainer size="default">
      <MomentsFloatDockSetup />
      <MomentsListLoader initialPage={momentsPage} />
    </PageContainer>
  );
}
