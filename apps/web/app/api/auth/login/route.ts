import { type NextRequest, NextResponse } from "next/server";
import type { LoginReq } from "@repo/api";
import { jsonWithAuthSession } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  const body: LoginReq = await request.json();

  const res = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (data.code !== 0) {
    return NextResponse.json(data);
  }

  return jsonWithAuthSession(data.data);
}
