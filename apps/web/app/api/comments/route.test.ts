import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

describe("/api/comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  describe("GET", () => {
    it("转发查询参数并返回评论列表", async () => {
      const mockData = { total: 1, pages: 1, page: 1, page_size: 10, list: [] };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 0, message: "ok", data: mockData }),
      } as Response);

      const req = new NextRequest(
        "http://localhost/api/comments?target_type=article&target_id=5&page=1",
      );
      const res = await GET(req);
      const body = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("localhost:8080/comments"),
        expect.objectContaining({ method: "GET" }),
      );
      expect(body).toEqual(mockData);
    });

    it("后端返回非 0 code 时返回 400", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 400, message: "目标不存在" }),
      } as Response);

      const req = new NextRequest("http://localhost/api/comments?target_type=article&target_id=0");
      const res = await GET(req);

      expect(res.status).toBe(400);
    });
  });

  describe("POST", () => {
    it("转发 access_token cookie 并返回新评论", async () => {
      const newComment = {
        id: 1,
        target_type: "article",
        target_id: 5,
        user_id: 1,
        content: "写得好",
        user: null,
        replies: [],
        created_at: "",
        updated_at: "",
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, message: "ok", data: newComment }),
      } as Response);

      const req = new NextRequest("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({ target_type: "article", target_id: 5, content: "写得好" }),
        headers: { Cookie: "access_token=mytoken123" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8080/comments",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer mytoken123" }),
        }),
      );
      expect(body).toEqual(newComment);
    });

    it("后端返回 401 时响应 401", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 401, message: "未登录" }),
      } as Response);

      const req = new NextRequest("http://localhost/api/comments", {
        method: "POST",
        body: JSON.stringify({ target_type: "article", target_id: 5, content: "hi" }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });
});
