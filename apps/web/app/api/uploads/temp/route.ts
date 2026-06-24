import { type NextRequest } from "next/server";
import { proxyPostForm } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  return proxyPostForm(req, "/uploads/temp");
}
