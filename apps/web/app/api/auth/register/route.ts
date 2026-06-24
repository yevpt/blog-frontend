import { type NextRequest, NextResponse } from "next/server";
import { jsonWithAuthSession } from "@/lib/auth-session";

/** 邮箱注册：透传 multipart/form-data，成功后写入登录 Cookie */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const res = await fetch(`${process.env.API_BASE_URL}/auth/register`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();

  if (data.code !== 0) {
    return NextResponse.json(data, { status: res.status });
  }

  return jsonWithAuthSession(data.data);
}
