import { type NextRequest } from "next/server";
import { proxyGet } from "@/lib/backend-proxy";

/** 转发批量用户在线感知查询（公开，可选登录） */
export async function GET(request: NextRequest) {
  return proxyGet(request, "/users/presence");
}
