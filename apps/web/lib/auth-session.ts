import { NextResponse } from "next/server";
import type { UserResp } from "@repo/api";

interface AuthTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserResp;
}

/** 将后端登录/注册成功响应转为仅含 user 的 JSON，并把 token 写入 httpOnly Cookie */
export function jsonWithAuthSession(data: AuthTokenPayload): NextResponse {
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
