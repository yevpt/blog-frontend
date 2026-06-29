// apps/web/app/api/articles/comments/[id]/route.ts
import { type NextRequest } from "next/server";
import { proxyDelete, proxyPatch } from "@/lib/backend-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/articles/comments/${id}`);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPatch(req, `/articles/comments/${id}`);
}
