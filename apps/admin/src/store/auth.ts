import { create } from "zustand";
import type { UserResp } from "@repo/api";

interface AuthState {
  accessToken: string | null;
  user: UserResp | null;
  setAccessToken: (token: string) => void;
  setUser: (user: UserResp) => void;
  logout: () => void;
}

/**
 * 认证状态 store。
 * accessToken 存在内存（页面刷新后清空），refresh_token 存 localStorage 由 App 启动时静默续期。
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  logout: () => set({ accessToken: null, user: null }),
}));
