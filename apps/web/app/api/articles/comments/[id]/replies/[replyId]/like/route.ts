// apps/web/app/api/articles/comments/[id]/replies/[replyId]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> },
) {
  const { id, replyId } = await params;
  return proxyPost(req, `/articles/comments/${id}/replies/${replyId}/like`, { hasBody: false });
}
