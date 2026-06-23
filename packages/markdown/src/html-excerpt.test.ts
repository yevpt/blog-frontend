import { describe, expect, it } from "vitest";
import { htmlExcerptToPlainText, isSafeImageSrc, normalizeImageSrc } from "./html-excerpt";

describe("isSafeImageSrc", () => {
  it("允许 https 与站内根路径", () => {
    expect(isSafeImageSrc("https://cdn.example.com/a.png")).toBe(true);
    expect(isSafeImageSrc("/uploads/a.png")).toBe(true);
  });

  it("拒绝裸相对路径与危险协议", () => {
    expect(isSafeImageSrc("123")).toBe(false);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("“123”")).toBe(false);
  });
});

describe("normalizeImageSrc", () => {
  it("剥除弯引号", () => {
    expect(normalizeImageSrc("“123”")).toBe("123");
  });
});

describe("htmlExcerptToPlainText", () => {
  it("将 img 标签替换为简短说明", () => {
    expect(htmlExcerptToPlainText('<img src="123" onerror="alert(1)"/>')).toBe("图片无法加载");
  });

  it("剥离其余 HTML 标签并解码常见实体", () => {
    expect(htmlExcerptToPlainText("<b>你好</b>&nbsp;世界")).toBe("你好 世界");
  });

  it("纯文本原样返回", () => {
    expect(htmlExcerptToPlainText("普通摘录")).toBe("普通摘录");
  });
});
