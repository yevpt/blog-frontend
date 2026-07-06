import { describe, expect, it } from "vitest";
import { sanitizeSvgForPreview, toSvgPreviewDataUrl } from "./sanitize-svg-for-preview";

const brokenSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M6 19"/></svg>`;

describe("sanitizeSvgForPreview", () => {
  it("移除重复 xmlns 与子节点 xmlns", () => {
    const sanitized = sanitizeSvgForPreview(brokenSvg);
    expect(sanitized.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/gi)).toHaveLength(1);
    expect(sanitized).not.toContain('<path xmlns="http://www.w3.org/2000/svg"');
  });

  it("为 currentColor 注入可见色", () => {
    const sanitized = sanitizeSvgForPreview(brokenSvg);
    expect(sanitized).toContain('style="color:#334155"');
  });

  it("生成 data URL", () => {
    expect(toSvgPreviewDataUrl(brokenSvg)).toMatch(/^data:image\/svg\+xml/);
  });
});
