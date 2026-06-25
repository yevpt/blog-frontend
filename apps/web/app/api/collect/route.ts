import { type NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-refresh";

function apiBaseUrl(): string {
  return process.env.API_BASE_URL!;
}

// 站点分析上报薄代理：登录态由服务端 cookie 转 Bearer；透传 visitor_id/Origin/XFF；恒回 204。
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // 服务端 HttpOnly access_token → Authorization Bearer；匿名不加（不做 refresh，过期即按匿名计）。
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // 转发全部 Cookie，保证 visitor_id 往返不丢。
  const cookie = req.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  // Origin 必须透传：后端按白名单反伪造，缺失会被判为 suspect 而不计数。
  const origin = req.headers.get("origin");
  if (origin) headers.Origin = origin;

  // 透传真实客户端 IP，供后端地理解析与 ip_hash（c.ClientIP 依赖 XFF/Real-IP）。
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers["X-Forwarded-For"] = xff;
  const realIp = req.headers.get("x-real-ip");
  if (realIp) headers["X-Real-IP"] = realIp;

  const res = new NextResponse(null, { status: 204 });
  try {
    const backendRes = await fetch(`${apiBaseUrl()}/collect`, { method: "POST", headers, body });
    for (const c of backendRes.headers.getSetCookie()) {
      res.headers.append("set-cookie", c);
    }
  } catch {
    // best-effort：后端不可用也不影响前台，静默返回 204
  }
  return res;
}
