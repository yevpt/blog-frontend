import { describe, expect, it } from "vitest";
import { resolveArticleCoverUrl, resolveFeaturedPostForViewport } from "./article-cover";
import type { FeaturedPost } from "@/app/_mock/types";

describe("resolveArticleCoverUrl", () => {
  it("移动端优先使用 mobile_cover_img_url", () => {
    expect(
      resolveArticleCoverUrl(
        {
          cover_img_url: "https://example.com/desktop.jpg",
          mobile_cover_img_url: "https://example.com/mobile.jpg",
        },
        "mobile",
      ),
    ).toBe("https://example.com/mobile.jpg");
  });

  it("移动端无专用封面时回退桌面封面", () => {
    expect(
      resolveArticleCoverUrl({ cover_img_url: "https://example.com/desktop.jpg" }, "mobile"),
    ).toBe("https://example.com/desktop.jpg");
  });

  it("桌面端优先使用 cover_img_url", () => {
    expect(
      resolveArticleCoverUrl(
        {
          cover_img_url: "https://example.com/desktop.jpg",
          mobile_cover_img_url: "https://example.com/mobile.jpg",
        },
        "desktop",
      ),
    ).toBe("https://example.com/desktop.jpg");
  });
});

describe("resolveFeaturedPostForViewport", () => {
  const post: FeaturedPost = {
    id: "1",
    title: "标题",
    excerpt: "摘要",
    coverImage: "https://example.com/desktop.jpg",
    mobileCoverImage: "https://example.com/mobile.jpg",
    category: "编程",
    date: "2026-01-01",
    href: "/articles/1",
  };

  it("移动端轮播替换为 mobileCoverImage", () => {
    expect(resolveFeaturedPostForViewport(post, "mobile").coverImage).toBe(
      "https://example.com/mobile.jpg",
    );
  });

  it("桌面端轮播保持 coverImage", () => {
    expect(resolveFeaturedPostForViewport(post, "desktop").coverImage).toBe(
      "https://example.com/desktop.jpg",
    );
  });
});
