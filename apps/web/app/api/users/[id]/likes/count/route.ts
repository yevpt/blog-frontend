import { type NextRequest } from "next/server";
import { proxyGet } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 转发用户点赞总数（公开，可选登录） */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyGet(request, `/users/${id}/likes/count`);
}
