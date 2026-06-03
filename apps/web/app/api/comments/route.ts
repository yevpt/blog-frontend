import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams.toString();
    const res = await fetch(`${process.env.API_BASE_URL}/comments?${params}`, {
      method: "GET",
    });
    const json = await res.json();
    if (json.code !== 0) {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }
    return NextResponse.json(json.data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    const body = await request.json();
    const res = await fetch(`${process.env.API_BASE_URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await res.json();
    if (json.code !== 0) {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }
    return NextResponse.json(json.data);
  } catch {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
