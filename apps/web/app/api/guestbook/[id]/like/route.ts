// apps/web/app/api/guestbook/[id]/like/route.ts
import { type NextRequest } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/guestbook/${id}/like`, { hasBody: false });
}
