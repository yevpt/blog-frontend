import { describe, expect, it } from "vitest";
import {
  buildCdnImageUrl,
  isGifImageUrl,
  isOptimizableRemoteImage,
  optimizeMarkdownImages,
  resolveCdnImageAttrs,
  stripTransformParams,
} from "./cdn-image";

describe("buildCdnImageUrl", () => {
  const base = "https://blog-oss.yevpt.com/blog/a.jpg?sign=abc&t=def";

  it("追加 w 和 q 且保留原 query", () => {
    const url = buildCdnImageUrl(base, 640, 75);
    expect(url).toContain("w=640");
    expect(url).toContain("q=75");
    expect(url).toContain("sign=abc");
  });

  it("GIF 原样返回", () => {
    const gif = "https://blog-oss.yevpt.com/blog/a.gif?sign=1&t=2";
    expect(buildCdnImageUrl(gif, 640)).toBe(gif);
  });
});

describe("stripTransformParams", () => {
  it("移除 w 和 q", () => {
    const src = "https://blog-oss.yevpt.com/blog/a.jpg?w=640&q=75&sign=1&t=2";
    expect(stripTransformParams(src)).toBe("https://blog-oss.yevpt.com/blog/a.jpg?sign=1&t=2");
  });
});

describe("isGifImageUrl", () => {
  it.each(["https://blog-oss.yevpt.com/a.gif", "https://blog-oss.yevpt.com/a.GIF?v=1"])(
    "识别 GIF：%s",
    (src) => expect(isGifImageUrl(src)).toBe(true),
  );
});

describe("isOptimizableRemoteImage", () => {
  it("白名单 HTTPS 静态图可优化", () => {
    expect(isOptimizableRemoteImage("https://blog-oss.yevpt.com/a.jpg?sign=1")).toBe(true);
  });

  it.each(["https://example.com/a.jpg", "http://blog-oss.yevpt.com/a.jpg"])("跳过 %s", (src) => {
    expect(isOptimizableRemoteImage(src)).toBe(false);
  });
});

describe("resolveCdnImageAttrs", () => {
  const original = "https://blog-oss.yevpt.com/posts/cover.jpg?x=1";

  it("article 预设生成 srcset", () => {
    const attrs = resolveCdnImageAttrs(original, "article");
    expect(attrs.optimizable).toBe(true);
    expect(attrs.src).toContain("w=1080");
    expect(attrs.srcSet).toContain("640w");
    expect(attrs.sizes).toContain("768px");
  });

  it("article 预设 fixed 模式只生成单一 src", () => {
    const attrs = resolveCdnImageAttrs(original, "article", {
      mode: "fixed",
      displayWidth: 828,
    });
    expect(attrs.optimizable).toBe(true);
    expect(attrs.src).toContain("w=828");
    expect(attrs.srcSet).toBeUndefined();
    expect(attrs.sizes).toBeUndefined();
  });

  it("thumbnail 预设使用固定宽度", () => {
    const attrs = resolveCdnImageAttrs(original, "thumbnail");
    expect(attrs.src).toContain("w=112");
    expect(attrs.sizes).toBe("56px");
  });

  it("off 时返回原图", () => {
    const attrs = resolveCdnImageAttrs(original, "off");
    expect(attrs).toEqual({ originalSrc: original, optimizable: false, src: original });
  });
});

describe("optimizeMarkdownImages", () => {
  function parseImage(html: string): HTMLImageElement {
    const container = document.createElement("div");
    container.innerHTML = html;
    const image = container.querySelector("img");
    if (!image) throw new Error("测试 HTML 缺少图片");
    return image;
  }

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
    expect(image.getAttribute("srcset")).toContain("640w");
    expect(image.getAttribute("sizes")).toContain("768px");
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
