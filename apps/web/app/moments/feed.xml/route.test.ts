// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MomentItemResp, MomentPageResp } from "@repo/api";

const mockState = vi.hoisted(() => ({
  listPublic: vi.fn(),
  markdownToHtml: vi.fn(),
  buildRssFeed: vi.fn(),
}));

vi.mock("@/lib/feed-articles", () => ({
  createPublicFeedApiClient: () => ({ moments: { listPublic: mockState.listPublic } }),
}));

vi.mock("@repo/markdown/server", () => ({
  markdownToHtml: mockState.markdownToHtml,
}));

vi.mock("@/lib/rss", () => ({
  buildRssFeed: mockState.buildRssFeed,
  toRfc822Date: (d: string) => new Date(d).toUTCString(),
}));

vi.mock("@/lib/seo", () => ({
  getCanonicalUrl: (path: string) => new URL(path, "https://www.yevpt.com/"),
  getSiteUrl: () => "https://www.yevpt.com",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => {
    throw new Error("moments feed should not read request cookies");
  }),
}));

import { GET, dynamic, revalidate } from "./route";

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "今天天气不错",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 0,
    comment_count: 0,
    is_liked: false,
    images: [],
    created_at: "2026-07-06T08:00:00Z",
    updated_at: "2026-07-06T08:00:00Z",
    ...overrides,
  };
}

describe("GET /moments/feed.xml", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockState.listPublic.mockReset();
    mockState.markdownToHtml.mockReset();
    mockState.buildRssFeed.mockReset();
  });

  it("强制动态生成", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("用 BLOG_USER_ID 过滤博主碎语", async () => {
    vi.stubEnv("BLOG_USER_ID", "42");
    const page: MomentPageResp = {
      total: 1,
      pages: 1,
      page: 1,
      page_size: 30,
      list: [makeMoment({ id: 7 })],
    };
    mockState.listPublic.mockResolvedValue(page);
    mockState.markdownToHtml.mockResolvedValue("<p>今天天气不错</p>");
    mockState.buildRssFeed.mockReturnValue("<rss/>");

    await GET();

    expect(mockState.listPublic).toHaveBeenCalledWith({
      user_id: 42,
      page: 1,
      page_size: 30,
    });
  });

  it("返回 application/xml 内容类型", async () => {
    vi.stubEnv("BLOG_USER_ID", "1");
    mockState.listPublic.mockResolvedValue({
      total: 0,
      pages: 0,
      page: 1,
      page_size: 30,
      list: [],
    });
    mockState.buildRssFeed.mockReturnValue("<?xml version='1.0'?><rss/>");

    const res = await GET();
    expect(res.headers.get("content-type")).toBe("application/xml; charset=utf-8");
  });

  it("图片以 HTML 拼入 content，仅 original 模式", async () => {
    vi.stubEnv("BLOG_USER_ID", "1");
    const moment = makeMoment({
      id: 3,
      content: "有图碎语",
      images: [
        {
          id: 1,
          name: "a",
          file_type: "image",
          url: "u",
          access_url: "https://img.test/a.jpg",
          display_mode: "original",
          size: 1,
          seq: 1,
        },
        {
          id: 2,
          name: "b",
          file_type: "image",
          url: "u",
          access_url: "https://img.test/b.jpg",
          display_mode: "blurred",
          size: 1,
          seq: 2,
        },
      ],
    });
    mockState.listPublic.mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 30,
      list: [moment],
    });
    mockState.markdownToHtml.mockResolvedValue("<p>有图碎语</p>");
    mockState.buildRssFeed.mockReturnValue("<rss/>");

    await GET();

    const itemsArg = mockState.buildRssFeed.mock.calls[0][0].items;
    expect(itemsArg[0].contentEncoded).toContain("https://img.test/a.jpg");
    expect(itemsArg[0].contentEncoded).not.toContain("img.test/b.jpg");
    expect(itemsArg[0].title).toBe("有图碎语");
    expect(itemsArg[0].link).toBe("https://www.yevpt.com/moments/3");
  });

  it("长内容标题被截断带省略号", async () => {
    vi.stubEnv("BLOG_USER_ID", "1");
    const long = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十超过";
    mockState.listPublic.mockResolvedValue({
      total: 1,
      pages: 1,
      page: 1,
      page_size: 30,
      list: [makeMoment({ content: long })],
    });
    mockState.markdownToHtml.mockResolvedValue("<p>x</p>");
    mockState.buildRssFeed.mockReturnValue("<rss/>");

    await GET();
    const itemsArg = mockState.buildRssFeed.mock.calls[0][0].items;
    expect(itemsArg[0].title.endsWith("…")).toBe(true);
  });

  it("API 抛错时降级为空列表", async () => {
    vi.stubEnv("BLOG_USER_ID", "1");
    mockState.listPublic.mockRejectedValue(new Error("down"));
    mockState.buildRssFeed.mockReturnValue("<rss><empty/></rss>");

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockState.buildRssFeed).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
  });
});
