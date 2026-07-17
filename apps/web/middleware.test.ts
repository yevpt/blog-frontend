// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "./middleware";

vi.stubEnv("API_BASE_URL", "http://mock-backend");

const secret = new TextEncoder().encode("test-secret");

async function makeToken(type: "access" | "refresh", expiresInSeconds: number) {
  return new SignJWT({ uid: 42, type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeReq(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

describe("web middleware auth refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("公开页面没有 token 时直接放行", async () => {
    const res = await middleware(makeReq("/"));

    expect(res.headers.get("location")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("普通页面 access 过期时使用 refresh token 静默续期", async () => {
    const expiredAccess = await makeToken("access", -60);
    const refreshToken = await makeToken("refresh", 3600);

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        message: "ok",
        data: {
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 7200,
        },
      }),
    );

    const res = await middleware(
      makeReq("/", `access_token=${expiredAccess}; refresh_token=${refreshToken}`),
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://mock-backend/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    );
    expect(res.headers.getSetCookie().join("\n")).toContain("access_token=new-access");
    expect(res.headers.get("location")).toBeNull();
  });

  it("proxy matcher 覆盖普通页面，才能在首屏 SSR 前续期", () => {
    expect(config.matcher.join(" ")).toContain("((?!");
    expect(config.matcher.join(" ")).not.toContain("/profile/:path*");
  });
});
