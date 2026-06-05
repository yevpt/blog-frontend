// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@repo/api";
import { POST } from "./route";

const mockToggleLike = vi.fn();

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: {
      toggleLike: mockToggleLike,
    },
  }),
}));

describe("/api/articles/[id]/like", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("转发点赞请求并返回最新点赞状态", async () => {
    mockToggleLike.mockResolvedValueOnce({ is_liked: true, like_count: 6 });

    const req = new NextRequest("http://localhost/api/articles/6/like", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "6" }) });
    const body = await res.json();

    expect(mockToggleLike).toHaveBeenCalledWith(6);
    expect(res.status).toBe(200);
    expect(body).toEqual({ is_liked: true, like_count: 6 });
  });

  it("未登录时返回 401", async () => {
    mockToggleLike.mockRejectedValueOnce(new ApiError(401, "未登录"));

    const req = new NextRequest("http://localhost/api/articles/6/like", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "6" }) });

    expect(res.status).toBe(401);
  });

  it("非法文章 id 返回 400", async () => {
    const req = new NextRequest("http://localhost/api/articles/abc/like", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "abc" }) });

    expect(res.status).toBe(400);
    expect(mockToggleLike).not.toHaveBeenCalled();
  });
});
