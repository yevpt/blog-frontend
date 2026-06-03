import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/comments/[id]/replies", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("转发到 /comments/{id}/replies 并返回回复数据", async () => {
    const newReply = {
      id: 3,
      target_type: "article",
      comment_id: 1,
      from_user_id: 2,
      to_user_id: 1,
      parent_reply_id: 0,
      content: "回复内容",
      created_at: "",
      updated_at: "",
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 0, message: "ok", data: newReply }),
    } as Response);

    const req = new NextRequest("http://localhost/api/comments/1/replies", {
      method: "POST",
      body: JSON.stringify({ target_type: "article", parent_reply_id: 0, content: "回复内容" }),
      headers: { Cookie: "access_token=mytoken" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/comments/1/replies",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
      }),
    );
    expect(body).toEqual(newReply);
  });

  it("id 非法时返回 400", async () => {
    const req = new NextRequest("http://localhost/api/comments/abc/replies", {
      method: "POST",
      body: JSON.stringify({ target_type: "article", content: "hi" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "abc" }) });

    expect(res.status).toBe(400);
  });

  it("后端返回 401 时响应 401", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: 401, message: "未登录" }),
    } as Response);

    const req = new NextRequest("http://localhost/api/comments/1/replies", {
      method: "POST",
      body: JSON.stringify({ target_type: "article", content: "hi" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(401);
  });
});
