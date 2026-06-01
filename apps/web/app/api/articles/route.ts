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
    const tagId = searchParams.get("tag_id");
    const recommend = searchParams.get("recommend");

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const categoryIdNum = Number(categoryId);
    const tagIdNum = Number(tagId);

    if (page && !isNaN(pageNum)) req.page = pageNum;
    if (pageSize && !isNaN(pageSizeNum)) req.page_size = pageSizeNum;
    if (categoryId && !isNaN(categoryIdNum)) req.category_id = categoryIdNum;
    if (tagId && !isNaN(tagIdNum)) req.tag_id = tagIdNum;
    if (recommend === "true") req.recommend = true;
    else if (recommend === "false") req.recommend = false;

    const api = await createServerApiClient();
    const data = await api.articles.listPublic(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
