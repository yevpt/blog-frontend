// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/backend-proxy", () => ({
  proxyPost: vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
}));

import { proxyPost } from "@/lib/backend-proxy";

describe("POST /api/articles/[id]/view", () => {
  beforeEach(() => vi.clearAllMocks());

  it("上报阅读并转发后端响应", async () => {
    await POST(new NextRequest("http://localhost/api/articles/5/view", { method: "POST" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(proxyPost).toHaveBeenCalledWith(expect.anything(), "/articles/5/view", {
      requireAuth: false,
      hasBody: false,
    });
  });

  it("非法 id 返回 400", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/articles/abc/view", { method: "POST" }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
    expect(proxyPost).not.toHaveBeenCalled();
  });
});
