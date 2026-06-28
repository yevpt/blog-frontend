import { describe, expect, it } from "vitest";
import { buildCdnImageUrl, isGifImageUrl, stripTransformParams } from "./blog-image-url";

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
