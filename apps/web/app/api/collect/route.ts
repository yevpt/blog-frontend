import { type NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-refresh";

function apiBaseUrl(): string {
  return process.env.API_BASE_URL!;
}

// clientIP 从 CDN/反代链取最左侧真实访客 IP，避免整串 XFF 被 Gin 从右解析成边缘节点 IP。
function clientIP(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? undefined;
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

  // 只传单一访客 IP：www 前有 CDN 时 XFF 常为「用户, 边缘节点」，整串透传会导致地理解析到 CDN 节点。
  const ip = clientIP(req);
  if (ip) {
    headers["X-Forwarded-For"] = ip;
    headers["X-Real-IP"] = ip;
  }

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
