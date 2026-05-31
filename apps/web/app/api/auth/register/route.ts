import { type NextRequest, NextResponse } from "next/server";
import type { RegisterReq } from "@repo/api";

export async function POST(request: NextRequest) {
  const body: RegisterReq = await request.json();
  const res = await fetch(`${process.env.API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  // 注册成功返回 user 信息，无 token（用户需单独调用登录接口）
  return NextResponse.json(data, { status: res.status });
}
