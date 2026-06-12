import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/oauth/[source]/callback
 *
 * 处理 GitHub（或其他平台）OAuth 回调的服务端代理。
 *
 * 安全说明：
 *   - code 和 state 由前端回调页从 URL 读取后传入此接口
 *   - 后端校验 state 一次性令牌，防止 CSRF
 *   - token 写入 httpOnly Cookie，JS 无法读取，防止 XSS 窃取
 *
 * 流程：
 *   1. 将 code + state 转发给 Go 后端
 *   2. 后端验证 state、换取 GitHub token、查询或创建用户
 *   3. 后端返回 access_token / refresh_token / user
 *   4. 本路由把 token 写入 Cookie，只把 user 返回给客户端
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";

  const backendUrl = new URL(`/oauth/${source}/callback`, process.env.API_BASE_URL);
  backendUrl.searchParams.set("code", code);
  backendUrl.searchParams.set("state", state);

  try {
    const res = await fetch(backendUrl.toString());
    const data = await res.json();

    // 后端业务失败（state 错误、用户被禁用等），直接透传给客户端
    if (data.code !== 0) {
      return NextResponse.json(data);
    }

    // action=login 时 login 字段存在；action=bind 时此字段为空（本版本不处理 bind）
    const loginData = data.data?.login;
    if (!loginData) {
      return NextResponse.json({ code: 1, message: "OAuth 回调数据异常" });
    }

    const { access_token, refresh_token, expires_in, user } = loginData;

    // 只向客户端返回用户信息，token 写入 httpOnly Cookie（与 /api/auth/login 策略一致）
    const response = NextResponse.json({ code: 0, message: "ok", data: { user } });

    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: expires_in, // 秒，与后端 expires_in 一致（通常 2 小时）
      path: "/",
    });

    response.cookies.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: "/",
    });

    return response;
  } catch {
    // 后端网络不可达或返回非 JSON 时，返回结构化错误，避免 Next.js 抛出 500 白屏
    return NextResponse.json({ code: -1, message: "服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}
