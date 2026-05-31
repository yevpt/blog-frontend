import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import type { UserResp } from "@repo/api";

export interface Session {
  user: UserResp;
}

/**
 * 从 httpOnly Cookie 读取并解析当前登录用户信息。
 * 只能在 Server Component / Server Action / Route Handler / Middleware 中调用。
 *
 * 使用 jose.decodeJwt 仅解码 payload（不验证签名），
 * 目的是提取用户信息和检查过期时间，实际签名验证由 Go 后端负责。
 *
 * JWT payload 字段对应 Go 后端 pkg/jwt.Claims：
 *   uid（用户 ID）、username、roles、type（access | refresh）、exp
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const payload = decodeJwt(accessToken);

    // 防止 refresh token 被误用为 access token
    if (payload["type"] !== "access") return null;

    // 检查过期（exp 为秒级时间戳，Date.now() 为毫秒）
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;

    return {
      user: {
        id: Number(payload["uid"]),
        username: String(payload["username"]),
        roles: payload["roles"] as string[] | undefined,
      },
    };
  } catch {
    // token 格式非法（如被篡改），视为未登录
    return null;
  }
}
