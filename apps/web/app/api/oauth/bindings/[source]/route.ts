import { type NextRequest } from "next/server";
import { proxyDelete } from "@/lib/backend-proxy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  return proxyDelete(req, `/oauth/bindings/${source}`);
}
