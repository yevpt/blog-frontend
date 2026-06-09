import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("page_size") ?? 40);

    const api = await createServerApiClient();
    const data = await api.users.listPublic({
      page: Number.isNaN(page) ? 1 : page,
      page_size: Number.isNaN(pageSize) ? 40 : pageSize,
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
