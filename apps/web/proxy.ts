import { type NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

/**
 * 解码 JWT payload，检查是否为有效的 access token（未过期且 type=access）。
 * 注意：此处只做过期检查，不验证签名，实际签名验证由 Go 后端负责。
 * Next.js Proxy 运行在 Edge Runtime（非 Node.js），使用 jose 是因为
 * 它兼容 Edge Runtime，而 jsonwebtoken 等依赖 Node.js 内置模块的库不可用。
 */
function isAccessTokenValid(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (payload["type"] !== "access") return false;
    if (!payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;

  // access token 有效，直接放行
  if (accessToken && isAccessTokenValid(accessToken)) {
    return NextResponse.next();
  }

  // access token 无效，尝试用 refresh token 换发新 token
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    try {
      const res = await fetch(`${process.env.API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        // 3 秒超时，防止后端无响应时阻塞所有受保护路由的请求
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();

      if (data.code === 0 && data.data) {
        const { access_token, refresh_token: newRefreshToken, expires_in } = data.data;
        const response = NextResponse.next();
        const isProduction = process.env.NODE_ENV === "production";

        // 写入新 token，让后续的 Server Component 和 Route Handler 能读取
        response.cookies.set("access_token", access_token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: expires_in,
          path: "/",
        });
        response.cookies.set("refresh_token", newRefreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
        return response;
      }
    } catch {
      // 刷新请求本身失败（网络错误等），跳到登录页
    }
  }

  // 未登录或刷新失败，重定向到登录页并携带原路径
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// 只在需要保护的路径上触发 proxy，减少无效执行
export const config = {
  matcher: ["/profile/:path*", "/vip/:path*", "/dashboard/:path*"],
};
