import { type NextRequest } from "next/server";
import { proxyDelete, proxyPost } from "@/lib/backend-proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPost(req, `/admin/users/${id}/roles/vip`, { hasBody: false });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/admin/users/${id}/roles/vip`);
}
