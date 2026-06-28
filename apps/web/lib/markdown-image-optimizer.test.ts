import { describe, expect, it } from "vitest";
import { isGifImageUrl, optimizeMarkdownImages } from "./markdown-image-optimizer";

function parseImage(html: string): HTMLImageElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  const image = container.querySelector("img");
  if (!image) throw new Error("测试 HTML 缺少图片");
  return image;
}

describe("optimizeMarkdownImages", () => {
  it("为白名单静态图生成 CDN 响应式地址并保存原图", () => {
    const original = "https://blog-oss.yevpt.com/posts/cover.jpg?x=1&y=2";
    const image = parseImage(
      optimizeMarkdownImages(
        `<p><img src="${original.replace("&", "&#x26;")}" alt="封面"></p>`,
        "article",
      ),
    );

    expect(image.dataset.originalSrc).toBe(original);
    expect(image.dataset.mdImageOptimized).toBe("true");
    expect(image.getAttribute("src")).toContain("w=1080");
    expect(image.getAttribute("src")).not.toContain("/_next/image");
    expect(image.getAttribute("srcset")).toContain("640w");
    expect(image.getAttribute("sizes")).toContain("768px");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
  });

  it.each([
    "https://example.com/a.jpg",
    "/local.jpg",
    "data:image/png;base64,AA==",
    "blob:https://blog.yevpt.com/id",
  ])("不改写不符合条件的地址 %s", (src) => {
    expect(optimizeMarkdownImages(`<img src="${src}">`, "comment")).toBe(`<img src="${src}">`);
  });
});

describe("isGifImageUrl", () => {
  it.each(["https://blog-oss.yevpt.com/a.gif", "https://blog-oss.yevpt.com/a.GIF?v=1"])(
    "识别 GIF：%s",
    (src) => expect(isGifImageUrl(src)).toBe(true),
  );
});
