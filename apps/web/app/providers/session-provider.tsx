"use client";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { UserDetailResp } from "@repo/api";

interface SessionContextValue {
  /** 当前登录用户的 ID；null 表示未登录 */
  userId: number | null;
  /** 当前登录用户的完整资料；/users/me 失败或未登录时为 null */
  profile: UserDetailResp | null;
}

// 默认值对应未登录状态
const SessionContext = createContext<SessionContextValue>({ userId: null, profile: null });

/**
 * 由 layout.tsx（Server Component）注入 userId 和完整用户资料。
 * userId 来自 JWT 解码（永远可信）；profile 来自 /users/me（Redis 支撑，失败时为 null）。
 */
export function SessionProvider({
  userId,
  profile,
  children,
}: {
  userId: number | null;
  profile: UserDetailResp | null;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ userId, profile }), [userId, profile]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** 在 Client Component 中获取当前登录用户信息 */
export function useSession() {
  return useContext(SessionContext);
}
