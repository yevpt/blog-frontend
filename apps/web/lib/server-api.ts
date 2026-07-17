import { cookies } from "next/headers";
import { createApiClient } from "@repo/api";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-refresh";

/**
 * 为当前请求创建一个携带 access token 的 API 客户端。
 * 只能在 Server Component / Server Action / Route Handler 中调用（依赖 next/headers）。
 *
 * middleware.ts 会在请求到达页面前用 refresh token 静默续期，正常情况下
 * 这里的 access token 已是新鲜的。但为防止个别入口绕过 middleware，
 * 仍接入 getRefreshToken/onTokenRefreshed 作为 SSR 兜底：遇 401 时自动
 * 用 refresh token 续期并重试，使本次 SSR 能取到正确数据。
 *
 * 注意：Server Component 不能写 cookie，续期得到的新 token 仅用于完成本次
 * 请求；cookie 落盘由 middleware（下次导航）与 /api 路由代理负责。
 */
export async function createServerApiClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  // SSR 续期期间在闭包内暂存新 access token，供 client 重试原请求时读取
  let refreshedAccessToken: string | null = null;

  return createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => refreshedAccessToken ?? accessToken,
    getRefreshToken: () => refreshToken,
    onTokenRefreshed: (tokens) => {
      refreshedAccessToken = tokens.access_token;
    },
  });
}
