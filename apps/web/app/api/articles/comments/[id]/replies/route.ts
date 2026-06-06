// apps/web/app/api/articles/comments/[id]/replies/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(req, `/articles/comments/${id}/replies`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/articles/comments/${id}/replies`);
}
