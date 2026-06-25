import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeReq(opts: { cookies?: string; origin?: string; xff?: string } = {}): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.cookies) headers.cookie = opts.cookies;
  if (opts.origin) headers.origin = opts.origin;
  if (opts.xff) headers["x-forwarded-for"] = opts.xff;
  return new NextRequest("http://localhost/api/collect", {
    method: "POST",
    headers,
    body: JSON.stringify({ event_type: "page_view", path: "/", session_id: "sid" }),
  });
}

describe("POST /api/collect", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "http://backend:8080";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("总是返回 204", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(204);
    expect(fetch).toHaveBeenCalledWith(
      "http://backend:8080/collect",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("有 access_token cookie 时加 Authorization Bearer", async () => {
    await POST(makeReq({ cookies: "access_token=jwt123; visitor_id=v1" }));
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt123");
  });

  it("匿名（无 access_token）不加 Authorization", async () => {
    await POST(makeReq({ cookies: "visitor_id=v1" }));
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("转发 Cookie / Origin / X-Forwarded-For 到后端", async () => {
    await POST(makeReq({ cookies: "visitor_id=v1", origin: "https://yevpt.com", xff: "1.2.3.4" }));
    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Cookie).toContain("visitor_id=v1");
    expect(headers.Origin).toBe("https://yevpt.com");
    expect(headers["X-Forwarded-For"]).toBe("1.2.3.4");
  });

  it("回写后端 Set-Cookie（首次下发 visitor_id）", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { "set-cookie": "visitor_id=newv; Path=/; HttpOnly" },
      }),
    );
    const res = await POST(makeReq());
    expect(res.headers.getSetCookie().join(",")).toContain("visitor_id=newv");
  });

  it("后端不可用时仍返回 204（best-effort，不影响前台）", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("backend down"));
    const res = await POST(makeReq());
    expect(res.status).toBe(204);
  });
});
