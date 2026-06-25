import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticlePageResp } from "@repo/api";

const sitemapMockState = vi.hoisted(() => ({
  listPublic: vi.fn(),
}));

vi.mock("@repo/api", () => ({
  createApiClient: () => ({
    articles: {
      listPublic: sitemapMockState.listPublic,
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => {
    throw new Error("sitemap should not read request cookies");
  }),
}));

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: {
      listPublic: vi.fn(() => {
        throw new Error("sitemap should use the public API client");
      }),
    },
  }),
}));

import sitemap from "./sitemap";

describe("sitemap metadata route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sitemapMockState.listPublic.mockReset();
  });

  it("生成静态公开路由和公开文章详情 URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");
    const page: ArticlePageResp = {
      total: 2,
      pages: 1,
      page: 1,
      page_size: 100,
      list: [
        {
          id: 1,
          title: "第一篇",
          user_id: 1,
          status: 1,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          is_liked: false,
          comment_count: 0,
          is_recommended: false,
          created_at: "2026-06-01T00:00:00Z",
          updated_at: "2026-06-02T00:00:00Z",
        },
        {
          id: 2,
          title: "第二篇",
          user_id: 1,
          status: 1,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          is_liked: false,
          comment_count: 0,
          is_recommended: false,
          created_at: "2026-06-03T00:00:00Z",
          updated_at: "2026-06-04T00:00:00Z",
        },
      ],
    };
    sitemapMockState.listPublic.mockResolvedValue(page);

    const entries = await sitemap();

    expect(sitemapMockState.listPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 100,
      sort_by: "updated_at",
      sort_order: "desc",
    });
    expect(entries).toEqual([
      {
        url: "https://example.com/",
        lastModified: expect.any(Date),
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: "https://example.com/moments",
        lastModified: expect.any(Date),
        changeFrequency: "daily",
        priority: 0.7,
      },
      {
        url: "https://example.com/guestbook",
        lastModified: expect.any(Date),
        changeFrequency: "weekly",
        priority: 0.5,
      },
      {
        url: "https://example.com/friend-links",
        lastModified: expect.any(Date),
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: "https://example.com/circle",
        lastModified: expect.any(Date),
        changeFrequency: "weekly",
        priority: 0.4,
      },
      {
        url: "https://example.com/articles/1",
        lastModified: new Date("2026-06-02T00:00:00Z"),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: "https://example.com/articles/2",
        lastModified: new Date("2026-06-04T00:00:00Z"),
        changeFrequency: "weekly",
        priority: 0.8,
      },
    ]);
  });

  it("后端直连失败时回退到公开 articles API", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
    sitemapMockState.listPublic.mockRejectedValue(new Error("backend unavailable"));
    const page: ArticlePageResp = {
      total: 1,
      pages: 1,
      page: 1,
      page_size: 100,
      list: [
        {
          id: 52,
          title: "公开文章",
          user_id: 1,
          status: 1,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          is_liked: false,
          comment_count: 0,
          is_recommended: false,
          created_at: "2021-06-24T16:45:51+08:00",
          updated_at: "2021-06-24T16:56:42+08:00",
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => page,
    });
    vi.stubGlobal("fetch", fetchMock);

    const entries = await sitemap();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/articles?page=1&page_size=100&sort_by=updated_at&sort_order=desc",
      { method: "GET" },
    );
    expect(entries).toContainEqual({
      url: "https://example.com/articles/52",
      lastModified: new Date("2021-06-24T16:56:42+08:00"),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });
});
