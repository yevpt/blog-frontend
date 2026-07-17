import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  authCookieHeader,
  isAccessTokenValid,
  refreshAuthTokens,
  setAuthCookies,
} from "@/lib/auth-refresh";

const PROTECTED_PATH_PREFIXES = ["/profile", "/vip", "/dashboard"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // access token 有效，直接放行
  if (accessToken && isAccessTokenValid(accessToken)) {
    return NextResponse.next();
  }

  // access token 无效，尝试用 refresh token 换发新 token
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const tokens = await refreshAuthTokens(refreshToken);
    if (tokens) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("cookie", authCookieHeader(request, tokens));
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      setAuthCookies(response, tokens);
      return response;
    }
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // 未登录或刷新失败，重定向到登录页并携带原路径
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// 覆盖普通页面，确保 access 过期时能在首屏 SSR 前用 refresh token 静默续期。
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
