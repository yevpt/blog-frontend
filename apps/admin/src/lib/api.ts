import { createApiClient } from "@repo/api";
import { useAuthStore } from "../store/auth";
import { resolveApiBaseUrl } from "./api-base-url";

/**
 * 全局 apiClient 单例，注入 Zustand token provider。
 * 在组件树外（如 App 启动逻辑）可直接使用，无需 hook。
 */
export const apiClient = createApiClient({
  baseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),

  // 从 Zustand store 读取当前 access token（getState() 可在组件树外调用）
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => localStorage.getItem("refresh_token"),

  onTokenRefreshed: (tokens) => {
    useAuthStore.getState().setAccessToken(tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
  },

  onRefreshFailed: () => {
    // 刷新失败意味着用户需要重新登录
    useAuthStore.getState().logout();
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  },
});
