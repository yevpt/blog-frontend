import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerApiClient } from "@/lib/server-api";
import { getCanonicalUrl } from "@/lib/seo";
import { PageContainer } from "@/components/common/page-container";
import { MomentDetail } from "@/components/moments/moment-detail";
import { MomentComments } from "@/components/moments/moment-comments";

interface PageProps {
  params: Promise<{ id: string }>;
}

const MOMENT_TITLE_MAX_LENGTH = 30;

function buildMomentTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "碎语";
  }
  if (trimmed.length < MOMENT_TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MOMENT_TITLE_MAX_LENGTH)}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const api = await createServerApiClient();
    const moment = await api.moments.getDetail(Number(id));
    const title = `${buildMomentTitle(moment.content)} | Yevpt's Blog`;
    const description = moment.content || "生活、思考与随笔的碎碎念";
    const canonical = getCanonicalUrl(`/moments/${moment.id}`).toString();
    const coverImage = moment.images.find((img) => img.display_mode === "original")?.access_url;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "article",
        publishedTime: moment.created_at,
        modifiedTime: moment.updated_at,
        images: coverImage ? [coverImage] : undefined,
      },
    };
  } catch {
    return { title: "碎语 | Yevpt's Blog" };
  }
}

export default async function MomentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const momentId = Number(id);

  if (!Number.isInteger(momentId) || momentId <= 0) notFound();

  const api = await createServerApiClient();
  let moment;
  try {
    moment = await api.moments.getDetail(momentId);
  } catch {
    notFound();
  }

  return (
    <PageContainer size="narrow">
      <MomentDetail initialMoment={moment} />
      <MomentComments momentId={moment.id} commentCount={moment.comment_count} />
    </PageContainer>
  );
}
