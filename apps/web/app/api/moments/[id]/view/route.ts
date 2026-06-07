import { type NextRequest, NextResponse } from "next/server";
import { proxyPost } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const momentId = Number(id);
  if (!Number.isInteger(momentId) || momentId <= 0) {
    return NextResponse.json({ error: "Invalid moment id" }, { status: 400 });
  }
  return proxyPost(req, `/moments/${momentId}/view`, { requireAuth: false, hasBody: false });
}
