import { type NextRequest } from "next/server";
import { proxyPatch } from "@/lib/backend-proxy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  return proxyPatch(req, `/users/me/social/${platform}`);
}
