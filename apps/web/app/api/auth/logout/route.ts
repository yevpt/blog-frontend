import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ code: 0, message: "ok", data: null });
  // 清除两个 token cookie（设置 maxAge=0 立即过期）
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}
