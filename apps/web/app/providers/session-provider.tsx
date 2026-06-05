"use client";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

interface SessionContextValue {
  /** 当前登录用户的 ID；null 表示未登录 */
  userId: number | null;
}

// 默认值 userId: null 对应未登录状态
const SessionContext = createContext<SessionContextValue>({ userId: null });

/**
 * 由 layout.tsx（Server Component）读取 cookie 后注入 userId。
 * Client Component 通过 useSession() 获取当前用户 ID，无需读取 httpOnly Cookie。
 * 用户详情（username、avatar 等）由各组件自行调用 GET /users/me 获取。
 */
export function SessionProvider({
  userId,
  children,
}: {
  userId: number | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={{ userId }}>{children}</SessionContext.Provider>;
}

/** 在 Client Component 中获取当前登录用户 ID，未登录返回 { userId: null } */
export function useSession() {
  return useContext(SessionContext);
}
