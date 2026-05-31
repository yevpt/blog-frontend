import { type NextRequest, NextResponse } from "next/server";
import type { LoginReq } from "@repo/api";

export async function POST(request: NextRequest) {
  const body: LoginReq = await request.json();

  // 服务端转发至 Go 后端（服务器间请求，无 CORS 问题）
  const res = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // 后端业务失败（凭证错误等），直接转发响应
  if (data.code !== 0) {
    return NextResponse.json(data);
  }

  const { access_token, refresh_token, expires_in, user } = data.data;

  // 只向客户端返回 user 信息，token 写入 httpOnly Cookie，JS 不可读
  const response = NextResponse.json({ code: 0, message: "ok", data: { user } });

  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("access_token", access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: expires_in, // 2 小时（与后端 expires_in 保持一致）
    path: "/",
  });

  // refresh token 有效期与后端配置一致（默认 168 小时 / 7 天）
  response.cookies.set("refresh_token", refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
