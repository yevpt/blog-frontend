import { decodeJwt } from "jose";
import { NextResponse } from "next/server";
import type { UserResp } from "@repo/api";

interface AuthTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: UserResp;
}

export interface AuthUserFallback {
  email?: string;
  nickname?: string;
}

/** 后端有时只返回 token 不返回 user，从 JWT uid 与注册表单字段补全 */
export function resolveAuthUser(payload: AuthTokenPayload, fallback?: AuthUserFallback): UserResp {
  if (payload.user?.id) {
    return payload.user;
  }

  const email = fallback?.email?.trim() ?? "";
  let id = 0;
  try {
    const jwtPayload = decodeJwt(payload.access_token);
    const uid = Number(jwtPayload["uid"]);
    if (Number.isFinite(uid)) {
      id = uid;
    }
  } catch {
    // JWT 解码失败时保留 id=0
  }

  const nickname = fallback?.nickname?.trim();
  return {
    id,
    username: email,
    email: email || undefined,
    nickname: nickname || undefined,
  };
}

/** 将后端登录/注册成功响应转为仅含 user 的 JSON，并把 token 写入 httpOnly Cookie */
export function jsonWithAuthSession(data: AuthTokenPayload & { user: UserResp }): NextResponse {
  const response = NextResponse.json({
    code: 0,
    message: "ok",
    data: { user: data.user },
  });

  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("access_token", data.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: data.expires_in,
    path: "/",
  });

  response.cookies.set("refresh_token", data.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
