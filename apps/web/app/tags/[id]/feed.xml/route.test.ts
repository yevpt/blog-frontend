// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  listTags: vi.fn(),
  buildArticleRssItems: vi.fn(),
  buildRssFeed: vi.fn(),
}));

vi.mock("@/lib/feed-articles", () => ({
  createPublicFeedApiClient: () => ({ tags: { list: mockState.listTags } }),
  buildArticleRssItems: mockState.buildArticleRssItems,
}));

vi.mock("@/lib/rss", () => ({
  buildRssFeed: mockState.buildRssFeed,
}));

vi.mock("@/lib/seo", () => ({
  getCanonicalUrl: (path: string) => new URL(path, "https://www.yevpt.com/"),
  getSiteUrl: () => "https://www.yevpt.com",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => {
    throw new Error("tag feed should not read request cookies");
  }),
}));

import { GET, dynamic, revalidate } from "./route";

function makeContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  } as const;
}

const emptyReq = {} as never;

describe("GET /tags/[id]/feed.xml", () => {
  afterEach(() => {
    mockState.listTags.mockReset();
    mockState.buildArticleRssItems.mockReset();
    mockState.buildRssFeed.mockReset();
  });

  it("强制动态生成", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("非法 id（0、负数、非数字）直接 404，不回源", async () => {
    const res1 = await GET(emptyReq, makeContext("0"));
    expect(res1.status).toBe(404);
    const res2 = await GET(emptyReq, makeContext("abc"));
    expect(res2.status).toBe(404);
    expect(mockState.listTags).not.toHaveBeenCalled();
  });

  it("标签不存在时返回 404", async () => {
    mockState.listTags.mockResolvedValue({
      list: [{ id: 1, name: "Go", seq: 1, article_count: 0 }],
    });

    const res = await GET(emptyReq, makeContext("999"));
    expect(res.status).toBe(404);
    expect(mockState.buildArticleRssItems).not.toHaveBeenCalled();
  });

  it("用 tagId 拉文章并生成带标签名的标题", async () => {
    mockState.listTags.mockResolvedValue({
      list: [{ id: 5, name: "Go", seq: 1, article_count: 3 }],
    });
    const items = [{ title: "x", link: "https://www.yevpt.com/articles/1", pubDate: "p" }];
    mockState.buildArticleRssItems.mockResolvedValue(items);
    mockState.buildRssFeed.mockReturnValue("<rss/>");

    const res = await GET(emptyReq, makeContext("5"));
    expect(res.status).toBe(200);
    expect(mockState.buildArticleRssItems).toHaveBeenCalledWith({ tagId: 5 });
    expect(mockState.buildRssFeed).toHaveBeenCalledWith({
      title: "#Go - Yevpt's Blog",
      description: "Yevpt's Blog 「Go」标签下的文章",
      link: "https://www.yevpt.com",
      selfLink: "https://www.yevpt.com/tags/5/feed.xml",
      items,
    });
  });

  it("buildArticleRssItems 抛错时降级为空列表，仍返回 200", async () => {
    mockState.listTags.mockResolvedValue({
      list: [{ id: 5, name: "Go", seq: 1, article_count: 3 }],
    });
    mockState.buildRssFeed.mockReturnValue("<rss/>");
    mockState.buildArticleRssItems.mockRejectedValue(new Error("down"));

    const res = await GET(emptyReq, makeContext("5"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/xml; charset=utf-8");
  });
});
