import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("登录成功：设置 httpOnly cookie，返回 user 信息", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          message: "ok",
          data: {
            access_token: "acc",
            refresh_token: "ref",
            expires_in: 7200,
            user: { id: 1, username: "vpt" },
          },
        }),
    } as Response);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: "vpt", password: "password123" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.code).toBe(0);
    // 返回 user 信息，不含 token
    expect(body.data.user.username).toBe("vpt");
    expect(body.data.access_token).toBeUndefined();

    // 验证 httpOnly cookie 被设置
    const setCookieHeader = res.headers.getSetCookie().join(",");
    expect(setCookieHeader).toContain("access_token=acc");
    expect(setCookieHeader).toContain("HttpOnly");
  });

  it("Go 后端返回错误时，转发错误响应", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 401, message: "用户名或密码错误" }),
    } as Response);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: "wrong", password: "wrong" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.code).toBe(401);
    expect(body.message).toBe("用户名或密码错误");
  });
});
