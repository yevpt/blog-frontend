import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

describe("GET /api/oauth/[source]/authorize", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("将 source 和 redirect_uri 透传至后端，返回 authorize_url", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize?client_id=xxx" },
        }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/authorize?action=login&redirect_uri=https%3A%2F%2Fwww.yevpt.com%2Foauth%2Fgithub%2Fcallback",
    );
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    const [calledUrl] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(calledUrl)).toContain("http://localhost:8080/oauth/github/authorize");
    expect(String(calledUrl)).toContain("redirect_uri=");
    expect(body.data.authorize_url).toBe("https://github.com/login/oauth/authorize?client_id=xxx");
  });

  it("action=login 缺省且无 token 时不加 Authorization（保持登录页行为不变）", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { authorize_url: "https://x" } }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/authorize?redirect_uri=https%3A%2F%2Fx%2Fcb",
    );
    await GET(req, { params: Promise.resolve({ source: "github" }) });

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toContain("action=login");
    // 无 token：headers 不含 Authorization
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("action=bind 时透传 action 并把 access_token cookie 作为 Bearer 转发", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { authorize_url: "https://x" } }),
    } as Response);

    const req = new NextRequest(
      "http://localhost/api/oauth/github/authorize?action=bind&redirect_uri=https%3A%2F%2Fx%2Fcb",
    );
    req.cookies.set("access_token", "tok-123");
    await GET(req, { params: Promise.resolve({ source: "github" }) });

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toContain("action=bind");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
  });

  it("后端返回错误时，透传错误响应给客户端", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "不支持的平台" }),
    } as Response);

    const req = new NextRequest("http://localhost/api/oauth/unknown/authorize");
    const res = await GET(req, { params: Promise.resolve({ source: "unknown" }) });
    const body = await res.json();

    expect(body.code).toBe(400);
    expect(body.message).toBe("不支持的平台");
  });

  it("后端网络异常时，返回 502 结构化错误", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network error"));

    const req = new NextRequest("http://localhost/api/oauth/github/authorize");
    const res = await GET(req, { params: Promise.resolve({ source: "github" }) });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.code).toBe(-1);
  });
});
