import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const momentId = Number(id);
    if (!Number.isInteger(momentId) || momentId <= 0) {
      return NextResponse.json({ error: "Invalid moment id" }, { status: 400 });
    }

    const api = await createServerApiClient();
    const data = await api.moments.toggleLike(momentId);
    return NextResponse.json({ is_liked: data.is_liked, like_count: data.like_count });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 401) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.code === 404) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to toggle moment like" }, { status: 500 });
  }
}
