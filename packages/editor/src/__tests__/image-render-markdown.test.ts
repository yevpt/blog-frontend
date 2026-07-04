// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { IMAGE_UPLOAD_PLACEHOLDER_SRC, renderImageMarkdown } from "../extensions/image";

describe("renderImageMarkdown", () => {
  it("常规图片输出 ![alt](src)", () => {
    expect(
      renderImageMarkdown({
        type: "image",
        attrs: { src: "https://e.com/1.png", alt: "一" },
      }),
    ).toBe("![一](https://e.com/1.png)");
  });

  it("无 alt 输出空 alt", () => {
    expect(renderImageMarkdown({ type: "image", attrs: { src: "https://e.com/1.png" } })).toBe(
      "![](https://e.com/1.png)",
    );
  });

  it("上传中/解码中/占位 src 输出空串", () => {
    expect(
      renderImageMarkdown({
        type: "image",
        attrs: { src: "https://e.com/1.png", uploadState: "loading" },
      }),
    ).toBe("");
    expect(
      renderImageMarkdown({
        type: "image",
        attrs: { src: "https://e.com/1.png", uploadState: "decoding" },
      }),
    ).toBe("");
    expect(
      renderImageMarkdown({ type: "image", attrs: { src: IMAGE_UPLOAD_PLACEHOLDER_SRC } }),
    ).toBe("");
  });
});
