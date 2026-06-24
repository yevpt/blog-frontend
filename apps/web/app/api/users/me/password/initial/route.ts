import { type NextRequest } from "next/server";
import { proxyPatch } from "@/lib/backend-proxy";

export async function PATCH(req: NextRequest) {
  return proxyPatch(req, "/users/me/password/initial");
}
