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
    // 模拟后端返回授权地址
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

    // 验证转发给后端的 URL 包含正确路径
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:8080/oauth/github/authorize"),
    );
    // redirect_uri 被正确编码后传出
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("redirect_uri="));
    expect(body.data.authorize_url).toBe("https://github.com/login/oauth/authorize?client_id=xxx");
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
