// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const feedArticlesMockState = vi.hoisted(() => ({
  buildArticleRssItems: vi.fn(),
}));

const rssMockState = vi.hoisted(() => ({
  buildRssFeed: vi.fn(),
}));

vi.mock("@/lib/feed-articles", () => ({
  buildArticleRssItems: feedArticlesMockState.buildArticleRssItems,
}));

vi.mock("@/lib/rss", () => ({
  buildRssFeed: rssMockState.buildRssFeed,
}));

vi.mock("@/lib/seo", () => ({
  getCanonicalUrl: (path: string) => new URL(path, "https://www.yevpt.com/"),
  getSiteUrl: () => "https://www.yevpt.com",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => {
    throw new Error("feed.xml should not read request cookies");
  }),
}));

import { GET, dynamic, revalidate } from "./route";

describe("GET /feed.xml", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    feedArticlesMockState.buildArticleRssItems.mockReset();
    rssMockState.buildRssFeed.mockReset();
  });

  it("强制动态生成，不缓存空结果", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("返回 application/xml 内容类型与正确的 feed 头部", async () => {
    feedArticlesMockState.buildArticleRssItems.mockResolvedValue([]);
    rssMockState.buildRssFeed.mockReturnValue("<?xml version='1.0'?><rss/>");

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    expect(res.headers.get("cache-control")).toContain("max-age=0");
    expect(await res.text()).toContain("<rss");
  });

  it("把站点标题、self link 与 items 传给 buildRssFeed", async () => {
    const items = [{ title: "t", link: "https://www.yevpt.com/articles/1", pubDate: "x" }];
    feedArticlesMockState.buildArticleRssItems.mockResolvedValue(items);
    rssMockState.buildRssFeed.mockReturnValue("<rss>ok</rss>");

    await GET();

    expect(rssMockState.buildRssFeed).toHaveBeenCalledWith({
      title: "Yevpt's Blog",
      description: "分享编程、工具、文学的个人博客",
      link: "https://www.yevpt.com",
      selfLink: "https://www.yevpt.com/feed.xml",
      items,
    });
  });

  it("buildArticleRssItems 抛错时降级为空列表，仍返回合法 XML", async () => {
    feedArticlesMockState.buildArticleRssItems.mockRejectedValue(new Error("api down"));
    rssMockState.buildRssFeed.mockReturnValue("<?xml version='1.0'?><rss><empty/></rss>");

    const res = await GET();
    expect(res.status).toBe(200);
    // 仍以空 items 调用了一次（容错）
    expect(rssMockState.buildRssFeed).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
    expect(await res.text()).toContain("<empty/>");
  });
});
