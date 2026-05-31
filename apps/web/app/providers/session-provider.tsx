"use client";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { UserResp } from "@repo/api";

interface SessionContextValue {
  user: UserResp | null;
}

// 默认值 user: null 对应未登录状态
const SessionContext = createContext<SessionContextValue>({ user: null });

/**
 * 由 layout.tsx（Server Component）读取 cookie 后注入用户信息。
 * Client Component 通过 useSession() 获取当前用户，无需读取 httpOnly Cookie。
 */
export function SessionProvider({
  user,
  children,
}: {
  user: UserResp | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

/** 在 Client Component 中获取当前登录用户，未登录返回 { user: null } */
export function useSession() {
  return useContext(SessionContext);
}
