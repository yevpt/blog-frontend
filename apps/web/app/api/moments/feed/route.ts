import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";
import type { MomentFeedListReq, MomentFeedScope, MomentFeedSort } from "@repo/api";

const FEED_SCOPES: MomentFeedScope[] = ["all", "owner", "friends"];
const FEED_SORTS: MomentFeedSort[] = ["latest", "hot"];

function parseFeedScope(value: string | null): MomentFeedScope | null {
  return FEED_SCOPES.includes(value as MomentFeedScope) ? (value as MomentFeedScope) : null;
}

function parseFeedSort(value: string | null): MomentFeedSort | null {
  return FEED_SORTS.includes(value as MomentFeedSort) ? (value as MomentFeedSort) : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scope = parseFeedScope(searchParams.get("scope"));
    const sort = parseFeedSort(searchParams.get("sort"));

    if (!scope || !sort) {
      return NextResponse.json({ error: "Invalid feed parameters" }, { status: 400 });
    }

    const req: MomentFeedListReq = { scope, sort };

    const page = searchParams.get("page");
    const pageSize = searchParams.get("page_size");
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);

    if (page && !Number.isNaN(pageNum)) req.page = pageNum;
    if (pageSize && !Number.isNaN(pageSizeNum)) req.page_size = pageSizeNum;

    const api = await createServerApiClient();
    const data = await api.moments.feed(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch moments feed" }, { status: 500 });
  }
}
