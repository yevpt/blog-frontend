import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";
import { proxyPostForm } from "@/lib/backend-proxy";
import type { MomentListReq } from "@repo/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const req: MomentListReq = {};

    const page = searchParams.get("page");
    const pageSize = searchParams.get("page_size");
    const userId = searchParams.get("user_id");
    const roleId = searchParams.get("role_id");
    const random = searchParams.get("random");
    const excludeIds = searchParams.get("exclude_ids");

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const userIdNum = Number(userId);
    const roleIdNum = Number(roleId);

    if (page && !Number.isNaN(pageNum)) req.page = pageNum;
    if (pageSize && !Number.isNaN(pageSizeNum)) req.page_size = pageSizeNum;
    if (userId && !Number.isNaN(userIdNum)) req.user_id = userIdNum;
    if (roleId && !Number.isNaN(roleIdNum)) req.role_id = roleIdNum;
    if (random === "true") req.random = true;
    if (excludeIds) {
      const ids = excludeIds
        .split(",")
        .map(Number)
        .filter((id) => !Number.isNaN(id));
      if (ids.length > 0) req.exclude_ids = ids;
    }

    const api = await createServerApiClient();
    const data = await api.moments.listPublic(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch moments" }, { status: 500 });
  }
}

/** 新增碎语：转发 multipart/form-data 到后端，需登录 */
export async function POST(request: NextRequest) {
  return proxyPostForm(request, "/moments");
}
