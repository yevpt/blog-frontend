import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/oauth/[source]/authorize
 *
 * 服务端代理，将客户端的 authorize 请求转发至 Go 后端。
 * 之所以走服务端代理而非客户端直接请求后端：
 *   1. 避免 CORS 问题（后端只对同源或配置的域名开放）
 *   2. 不暴露后端内网地址给浏览器
 *
 * 查询参数：
 *   - redirect_uri: 前端 OAuth 回调页的完整 URL（由客户端传入）
 *
 * 返回：{ code, data: { authorize_url } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? "";

  // 拼接后端 URL，使用 URL + searchParams 避免手拼字符串导致的编码问题
  const backendUrl = new URL(`/oauth/${source}/authorize`, process.env.API_BASE_URL);
  backendUrl.searchParams.set("action", "login");
  backendUrl.searchParams.set("redirect_uri", redirectUri);

  try {
    const res = await fetch(backendUrl.toString());
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // 后端网络不可达或返回非 JSON 时，返回结构化错误，避免 Next.js 抛出 500 白屏
    return NextResponse.json({ code: -1, message: "服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}
