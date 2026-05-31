import { cookies } from "next/headers";
import { createApiClient } from "@repo/api";

/**
 * 为当前请求创建一个携带 access token 的 API 客户端。
 * 只能在 Server Component / Server Action / Route Handler 中调用（依赖 next/headers）。
 *
 * 注意：此处不配置 onRefreshFailed/onTokenRefreshed，因为 token 刷新
 * 由 proxy.ts 在请求到达页面前已处理完成。若到这里还遇到 401，
 * 说明用户真的未登录，由调用方处理（重定向或显示 401 错误）。
 */
export async function createServerApiClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value ?? null;

  return createApiClient({
    baseUrl: process.env.API_BASE_URL!,
    getAccessToken: () => accessToken,
  });
}
