// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { getSession } from "./session";

const SECRET = new TextEncoder().encode("test-secret");

async function makeAccessToken(uid: number, expOffsetSec = 3600) {
  return new SignJWT({ uid, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expOffsetSec)
    .sign(SECRET);
}

async function makeRefreshToken(uid: number) {
  return new SignJWT({ uid, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(SECRET);
}

function mockCookies(tokenValue: string | undefined) {
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) => (name === "access_token" ? { value: tokenValue } : undefined),
  });
}

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有效 access token 返回 { userId }", async () => {
    mockCookies(await makeAccessToken(42));
    const session = await getSession();
    expect(session).toEqual({ userId: 42 });
  });

  it("无 access_token cookie 返回 null", async () => {
    mockCookies(undefined);
    expect(await getSession()).toBeNull();
  });

  it("过期 token 返回 null", async () => {
    mockCookies(await makeAccessToken(1, -10));
    expect(await getSession()).toBeNull();
  });

  it("refresh token 不可用于 session，返回 null", async () => {
    mockCookies(await makeRefreshToken(1));
    expect(await getSession()).toBeNull();
  });

  it("格式非法的 token 返回 null", async () => {
    mockCookies("not.a.jwt");
    expect(await getSession()).toBeNull();
  });
});
