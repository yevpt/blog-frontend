// apps/web/app/api/guestbook/route.ts
import { type NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  return proxyGet(req, "/guestbook");
}

export async function POST(req: NextRequest) {
  return proxyPost(req, "/guestbook");
}
