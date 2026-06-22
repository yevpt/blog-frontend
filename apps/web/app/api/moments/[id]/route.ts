import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyDelete(req, `/moments/${id}`);
}
