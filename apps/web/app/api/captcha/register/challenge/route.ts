import { NextResponse } from "next/server";

export async function POST() {
  const res = await fetch(`${process.env.API_BASE_URL}/captcha/register/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
