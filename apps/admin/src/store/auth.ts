import { create } from "zustand";
import type { UserResp } from "@repo/api";

type AdminUser = UserResp & {
  avatar_url?: string;
};

interface AuthState {
  accessToken: string | null;
  user: AdminUser | null;
  setAccessToken: (token: string) => void;
  setUser: (user: AdminUser) => void;
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
