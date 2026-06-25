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
 *   - action: "login"（缺省，登录）或 "bind"（绑定当前账号）
 *
 * action=bind 时需后端知道当前用户：将 access_token cookie 作为
 * Authorization: Bearer 转发；登录场景无 token 时不加 header，行为不变。
 *
 * 返回：{ code, data: { authorize_url } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? "";
  // action 缺省 login，保持登录页 oauth-grid 既有行为不变
  const action = request.nextUrl.searchParams.get("action") ?? "login";

  try {
    // 拼接后端 URL，使用 URL + searchParams 避免手拼字符串导致的编码问题
    // redirect_uri 不在此处校验：真正的安全边界是 GitHub 注册的回调域名白名单
    // 和后端生成的一次性 state 令牌（CSRF 防护），前者已足够。
    // new URL() 放在 try 内：API_BASE_URL 未配置时同步抛出，由 catch 统一处理
    const backendUrl = new URL(`/oauth/${source}/authorize`, process.env.API_BASE_URL);
    backendUrl.searchParams.set("action", action);
    backendUrl.searchParams.set("redirect_uri", redirectUri);

    // 绑定场景需要登录态：有 token 才透传 Authorization，登录场景无 token 不加 header
    const token = request.cookies.get("access_token")?.value;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(backendUrl.toString(), { headers });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // 后端网络不可达或返回非 JSON 时，返回结构化错误，避免 Next.js 抛出 500 白屏
    return NextResponse.json({ code: -1, message: "服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}
