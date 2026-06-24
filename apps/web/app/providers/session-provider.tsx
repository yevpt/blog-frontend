"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UserDetailResp } from "@repo/api";

interface SessionContextValue {
  /** 当前登录用户的 ID；null 表示未登录 */
  userId: number | null;
  /** 当前登录用户的完整资料；/users/me 失败或未登录时为 null */
  profile: UserDetailResp | null;
  /** 客户端合并更新当前 session profile（如资料页编辑后同步 Navbar） */
  patchProfile: (patch: Partial<UserDetailResp>) => void;
}

// 默认值对应未登录状态
const SessionContext = createContext<SessionContextValue>({
  userId: null,
  profile: null,
  patchProfile: () => {},
});

/**
 * 由 layout.tsx（Server Component）注入 userId 和完整用户资料。
 * userId 来自 JWT 解码（永远可信）；profile 来自 /users/me（Redis 支撑，失败时为 null）。
 */
export function SessionProvider({
  userId,
  profile: initialProfile,
  children,
}: {
  userId: number | null;
  profile: UserDetailResp | null;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<UserDetailResp | null>(initialProfile);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const patchProfile = useCallback((patch: Partial<UserDetailResp>) => {
    setProfile((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(() => ({ userId, profile, patchProfile }), [userId, profile, patchProfile]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** 在 Client Component 中获取当前登录用户信息 */
export function useSession() {
  return useContext(SessionContext);
}
