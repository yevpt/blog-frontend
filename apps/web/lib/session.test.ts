import { describe, it, expect, vi } from "vitest";
import { getSession } from "./session";

// mock next/headers：模拟 Server Component 的 cookie 读取
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";

// CookieStore 是 cookies() 的 resolve 类型，用于让 mock 类型对齐
type CookieStore = Awaited<ReturnType<typeof cookies>>;

// 生成一个合法结构的 JWT（不含真实签名，仅用于测试 decode 逻辑）
// 格式：base64url(header).base64url(payload).signature
function makeToken(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.fake-sig`;
}

// 构造最简 CookieStore mock，只实现测试用到的 get 方法
function mockCookies(tokenValue?: string): CookieStore {
  return {
    get: (name: string) =>
      name === "access_token" && tokenValue
        ? { name: "access_token", value: tokenValue }
        : undefined,
  } as unknown as CookieStore;
}

describe("getSession", () => {
  it("无 access_token cookie 时返回 null", async () => {
    vi.mocked(cookies).mockResolvedValue(mockCookies());
    expect(await getSession()).toBeNull();
  });

  it("token 已过期时返回 null", async () => {
    const expiredToken = makeToken({
      uid: 1,
      username: "vpt",
      roles: ["admin"],
      type: "access",
      exp: Math.floor(Date.now() / 1000) - 100, // 100 秒前已过期
    });
    vi.mocked(cookies).mockResolvedValue(mockCookies(expiredToken));
    expect(await getSession()).toBeNull();
  });

  it("有效 token 返回正确的 Session", async () => {
    const validToken = makeToken({
      uid: 1,
      username: "vpt",
      roles: ["admin"],
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 7200,
    });
    vi.mocked(cookies).mockResolvedValue(mockCookies(validToken));

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.user.id).toBe(1);
    expect(session?.user.username).toBe("vpt");
    expect(session?.user.roles).toEqual(["admin"]);
  });

  it("type 为 refresh 的 token 返回 null", async () => {
    const refreshToken = makeToken({
      uid: 1,
      username: "vpt",
      type: "refresh",
      exp: Math.floor(Date.now() / 1000) + 7200,
    });
    vi.mocked(cookies).mockResolvedValue(mockCookies(refreshToken));
    expect(await getSession()).toBeNull();
  });
});
