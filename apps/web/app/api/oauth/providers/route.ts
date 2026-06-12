import { NextResponse } from "next/server";

/**
 * GET /api/oauth/providers
 *
 * 代理后端接口，返回当前已启用的第三方登录平台列表。
 */
export async function GET() {
  try {
    const backendUrl = new URL("/oauth/providers", process.env.API_BASE_URL);
    const res = await fetch(backendUrl.toString());
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ code: -1, message: "服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}
