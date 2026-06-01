import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";
import type { ArticleListReq } from "@repo/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const req: ArticleListReq = {};
    const page = searchParams.get("page");
    const pageSize = searchParams.get("page_size");
    const categoryId = searchParams.get("category_id");
    if (page) req.page = Number(page);
    if (pageSize) req.page_size = Number(pageSize);
    if (categoryId) req.category_id = Number(categoryId);

    const api = await createServerApiClient();
    const data = await api.articles.listPublic(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
