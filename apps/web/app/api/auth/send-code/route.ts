import { type NextRequest, NextResponse } from "next/server";

// 纯透传：将请求转发给 Go 后端，原样返回响应（含限流 429）
export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${process.env.API_BASE_URL}/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
