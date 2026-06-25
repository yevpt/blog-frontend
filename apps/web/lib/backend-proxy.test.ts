// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxyGet, proxyPost, proxyDelete } from "./backend-proxy";

vi.stubEnv("API_BASE_URL", "http://mock-backend");

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function makeReq(url: string, method = "GET", withAuth = false): NextRequest {
  const headers: Record<string, string> = {};
  if (withAuth) headers.Cookie = "access_token=test-token";
  return new NextRequest(url, { method, headers });
}

function makeReqWithCookie(url: string, method: string, cookie: string): NextRequest {
  return new NextRequest(url, { method, headers: { Cookie: cookie } });
}

describe("backend-proxy parseBackendJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("成功响应返回 json.data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: 0, message: "ok", data: { items: [] } }),
    );
    const res = await proxyGet(makeReq("http://localhost/api/test"), "/test");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ items: [] });
  });

  it("业务错误 (code!=0) 透传后端 message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: 400, message: "内容长度不能超过 2000 个字符" }),
    );
    const res = await proxyGet(makeReq("http://localhost/api/test"), "/test");
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("内容长度不能超过 2000 个字符");
  });

  it("403 透传后端 message 而非写死 Forbidden", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: 403, message: "无权删除该碎语" }, 403),
    );
    const res = await proxyDelete(makeReq("http://localhost/api/test", "DELETE", true), "/test");
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe("无权删除该碎语");
  });

  it("404 透传后端 message 而非写死 Not found", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: 404, message: "该碎语不存在" }, 404),
    );
    const res = await proxyGet(makeReq("http://localhost/api/test"), "/test");
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("该碎语不存在");
  });

  it("401 透传后端 message 而非写死 Unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: 401, message: "未登录或 token 已过期" }, 401),
    );
    const res = await proxyPost(makeReq("http://localhost/api/test", "POST", true), "/test");
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("未登录或 token 已过期");
  });

  it("403 后端无 message 时回退默认文案", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ code: 403 }, 403));
    const res = await proxyGet(makeReq("http://localhost/api/test"), "/test");
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("404 后端无 message 时回退默认文案", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ code: 404 }, 404));
    const res = await proxyGet(makeReq("http://localhost/api/test"), "/test");
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("Not found");
  });

  it("后端不可达时返回 502 Backend unavailable", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const res = await proxyGet(makeReq("http://localhost/api/test"), "/test");
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toBe("Backend unavailable");
  });

  it("proxyPost 无 token 且 requireAuth 时返回 401", async () => {
    const req = new NextRequest("http://localhost/api/test", { method: "POST" });
    const res = await proxyPost(req, "/test");
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("proxyPost 无 access 但有 refresh 时先续期再请求后端", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          message: "ok",
          data: { access_token: "new-acc", refresh_token: "new-ref", expires_in: 7200 },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: "ok", data: { saved: true } }));

    const req = makeReqWithCookie("http://localhost/api/test", "POST", "refresh_token=old-ref");
    const res = await proxyPost(req, "/test");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ saved: true });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "http://mock-backend/auth/refresh",
      expect.objectContaining({ body: JSON.stringify({ refresh_token: "old-ref" }) }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "http://mock-backend/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer new-acc" }),
      }),
    );
    expect(res.headers.getSetCookie().join("\n")).toContain("access_token=new-acc");
  });

  it("proxyGet 收到后端 401 时续期并重试一次", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ code: 401, message: "token 已过期" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          message: "ok",
          data: { access_token: "new-acc", refresh_token: "new-ref", expires_in: 7200 },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: 0, message: "ok", data: { items: [1] } }));

    const req = makeReqWithCookie(
      "http://localhost/api/test",
      "GET",
      "access_token=old-acc; refresh_token=old-ref",
    );
    const res = await proxyGet(req, "/test");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ items: [1] });
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "http://mock-backend/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer new-acc" }),
      }),
    );
    expect(res.headers.getSetCookie().join("\n")).toContain("refresh_token=new-ref");
  });
});
