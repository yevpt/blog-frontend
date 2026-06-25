import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

describe("GET /api/oauth/[source]/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("登录成功：将 token 写入 httpOnly Cookie，只向客户端返回 user", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            action: "login",
            login: {
              access_token: "acc",
              refresh_token: "ref",
              expires_in: 7200,
              user: { id: 1, username: "vpt" },
            },
          },
        }),
    } as Response);

    const req = new NextRequest("http://localhost/api/oauth/github/callback?code=abc&state=xyz");
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    // 只返回 user，不把 token 暴露给 JS
    expect(body.code).toBe(0);
    expect(body.data.user.username).toBe("vpt");
    expect(body.data.access_token).toBeUndefined();

    // token 写入 httpOnly Cookie
    const setCookieHeader = res.headers.getSetCookie().join(",");
    expect(setCookieHeader).toContain("access_token=acc");
    expect(setCookieHeader).toContain("refresh_token=ref");
    expect(setCookieHeader).toContain("HttpOnly");
  });

  it("绑定成功：透传 bind action，不写登录 Cookie", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            action: "bind",
            binding: { source: "github", social_user_id: 1 },
          },
        }),
    } as Response);

    const req = new NextRequest("http://localhost/api/oauth/github/callback?code=abc&state=xyz");
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    expect(body).toEqual({
      code: 0,
      message: "ok",
      data: { action: "bind", binding: { source: "github", social_user_id: 1 } },
    });
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("code 和 state 被正确转发给后端", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            action: "login",
            login: {
              access_token: "acc",
              refresh_token: "ref",
              expires_in: 7200,
              user: { id: 1, username: "vpt" },
            },
          },
        }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/callback?code=mycode&state=mystate",
    );
    await GET(req, { params: Promise.resolve({ source: "github" }) });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("code=mycode"));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("state=mystate"));
  });

  it("后端返回业务错误时，透传错误响应，不设置 Cookie", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "state 校验失败" }),
    } as Response);

    const req = new NextRequest("http://localhost/api/oauth/github/callback?code=bad&state=bad");
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    expect(body.code).toBe(400);
    expect(body.message).toBe("state 校验失败");
    // 失败时不应设置任何 Cookie
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("后端网络异常时，返回 502 结构化错误", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network error"));

    const req = new NextRequest("http://localhost/api/oauth/github/callback?code=abc&state=xyz");
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.code).toBe(-1);
  });
});
