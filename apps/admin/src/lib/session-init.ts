import { apiClient } from "./api";
import { useAuthStore } from "../store/auth";

/** 启动时静默续期去重：StrictMode 双挂载时复用同一 Promise，避免重复请求 */
let initPromise: Promise<void> | null = null;

/**
 * 读取 localStorage 中的 refresh_token 并换发 access_token。
 * 同一页面生命周期内多次调用只会发起一次 HTTP 请求。
 */
export function initSessionFromRefreshToken(): Promise<void> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = apiClient.auth
    .refresh({ refresh_token: refreshToken })
    .then((tokens) => {
      useAuthStore.getState().setAccessToken(tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
    })
    .catch(() => {
      initPromise = null;
      localStorage.removeItem("refresh_token");
      useAuthStore.getState().logout();
    });

  return initPromise;
}

/** 仅供测试重置模块内去重状态 */
export function resetSessionInitForTests(): void {
  initPromise = null;
}
