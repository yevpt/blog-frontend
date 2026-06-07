import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";
import type { MomentListReq } from "@repo/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const req: MomentListReq = {};

    const page = searchParams.get("page");
    const pageSize = searchParams.get("page_size");
    const userId = searchParams.get("user_id");
    const roleId = searchParams.get("role_id");

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const userIdNum = Number(userId);
    const roleIdNum = Number(roleId);

    if (page && !Number.isNaN(pageNum)) req.page = pageNum;
    if (pageSize && !Number.isNaN(pageSizeNum)) req.page_size = pageSizeNum;
    if (userId && !Number.isNaN(userIdNum)) req.user_id = userIdNum;
    if (roleId && !Number.isNaN(roleIdNum)) req.role_id = roleIdNum;

    const api = await createServerApiClient();
    const data = await api.moments.listPublic(req);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch moments" }, { status: 500 });
  }
}
