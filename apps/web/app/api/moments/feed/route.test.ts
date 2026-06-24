import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFeed = vi.fn();

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { feed: mockFeed },
  }),
}));

import { GET } from "./route";

describe("GET /api/moments/feed", () => {
  beforeEach(() => {
    mockFeed.mockReset();
    mockFeed.mockResolvedValue({ total: 0, pages: 0, page: 1, page_size: 10, list: [] });
  });

  it("scope 与 sort 合法时转发到 api.moments.feed", async () => {
    const req = new NextRequest(
      "http://localhost/api/moments/feed?scope=all&sort=latest&page=1&page_size=20",
    );
    await GET(req);

    expect(mockFeed).toHaveBeenCalledWith({
      scope: "all",
      sort: "latest",
      page: 1,
      page_size: 20,
    });
  });

  it("缺少 scope 或 sort 时返回 400", async () => {
    const req = new NextRequest("http://localhost/api/moments/feed?scope=all");
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mockFeed).not.toHaveBeenCalled();
  });
});
