import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const proxyPostForm = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPostForm: (...a: unknown[]) => proxyPostForm(...a) }));

const mockListPublic = vi.fn();
vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { listPublic: mockListPublic },
  }),
}));

import { GET, POST } from "./route";

describe("POST /api/moments", () => {
  it("委托给 proxyPostForm 转发到 /moments", async () => {
    proxyPostForm.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof POST>[0];
    await POST(req);
    expect(proxyPostForm).toHaveBeenCalledWith(req, "/moments");
  });
});

describe("GET /api/moments", () => {
  beforeEach(() => {
    mockListPublic.mockReset();
    mockListPublic.mockResolvedValue({ total: 0, pages: 0, page: 1, page_size: 10, list: [] });
  });

  it("透传 random 和 exclude_ids 到 api.moments.listPublic", async () => {
    const req = new NextRequest(
      "http://localhost/api/moments?random=true&exclude_ids=1,2,3&page_size=3",
    );
    await GET(req);

    expect(mockListPublic).toHaveBeenCalledWith({
      page_size: 3,
      random: true,
      exclude_ids: [1, 2, 3],
    });
  });

  it("缺少 random/exclude_ids 时不附加这两个字段", async () => {
    const req = new NextRequest("http://localhost/api/moments?user_id=1&page=1&page_size=3");
    await GET(req);

    expect(mockListPublic).toHaveBeenCalledWith({
      user_id: 1,
      page: 1,
      page_size: 3,
    });
  });

  it("exclude_ids 含非数字片段时过滤掉无效项", async () => {
    const req = new NextRequest("http://localhost/api/moments?random=true&exclude_ids=1,abc,3");
    await GET(req);

    expect(mockListPublic).toHaveBeenCalledWith({
      random: true,
      exclude_ids: [1, 3],
    });
  });
});
