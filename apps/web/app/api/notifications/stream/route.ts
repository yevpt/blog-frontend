import { type NextRequest } from "next/server";
import { proxySseGet } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  return proxySseGet(req, "/notifications/stream");
}
