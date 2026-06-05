// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const mockView = vi.fn();

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: { view: mockView },
  }),
}));

describe("POST /api/articles/[id]/view", () => {
  beforeEach(() => vi.clearAllMocks());

  it("上报阅读并返回 204", async () => {
    mockView.mockResolvedValueOnce(undefined);
    const req = new NextRequest("http://localhost/api/articles/5/view", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    expect(mockView).toHaveBeenCalledWith(5);
    expect(res.status).toBe(204);
  });

  it("非法 id 返回 400", async () => {
    const req = new NextRequest("http://localhost/api/articles/abc/view", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
    expect(mockView).not.toHaveBeenCalled();
  });

  it("后端异常返回 500", async () => {
    mockView.mockRejectedValueOnce(new Error("network error"));
    const req = new NextRequest("http://localhost/api/articles/5/view", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(500);
  });
});
