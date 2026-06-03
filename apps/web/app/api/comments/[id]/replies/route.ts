import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
    }

    const accessToken = request.cookies.get("access_token")?.value;
    const body = await request.json();
    const res = await fetch(`${process.env.API_BASE_URL}/comments/${commentId}/replies`, {
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
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}
