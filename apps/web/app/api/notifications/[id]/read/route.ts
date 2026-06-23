import { type NextRequest } from "next/server";
import { proxyPatch } from "@/lib/backend-proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyPatch(req, `/notifications/${id}/read`);
}
