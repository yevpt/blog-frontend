import { type NextRequest } from "next/server";
import { proxyGet } from "@/lib/backend-proxy";

/**
 * GET /api/users/me
 *
 * 代理后端 GET /users/me，返回当前登录用户完整资料（含 password_set、email、meta.sub_email、
 * setting.mail_show 等账号安全所需字段）。客户端组件（如账号安全 Tab）经此读取。
 */
export async function GET(req: NextRequest) {
  return proxyGet(req, "/users/me");
}
