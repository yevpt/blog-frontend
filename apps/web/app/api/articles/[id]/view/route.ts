import { type NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/server-api";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const api = await createServerApiClient();
    await api.articles.view(articleId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
