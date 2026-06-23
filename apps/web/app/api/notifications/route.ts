import { type NextRequest } from "next/server";
import { proxyGet } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  return proxyGet(req, "/notifications");
}
