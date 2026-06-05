import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export interface Session {
  userId: number;
}

/**
 * 从 httpOnly Cookie 的 access token 解码 userId。
 * 只能在 Server Component / Server Action / Route Handler 中调用。
 * 不验证签名（由 Go 后端负责）；只检查 type=access 和过期时间。
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const payload = decodeJwt(accessToken);
    if (payload["type"] !== "access") return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { userId: Number(payload["uid"]) };
  } catch {
    return null;
  }
}
