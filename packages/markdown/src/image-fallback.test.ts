import { describe, expect, it } from "vitest";
import {
  MD_IMAGE_FALLBACK_CLASS,
  MD_IMAGE_FALLBACK_LABEL,
  buildImageFallbackHtml,
} from "./image-fallback";

describe("buildImageFallbackHtml", () => {
  it("输出带 image sprite 引用的占位结构", () => {
    const html = buildImageFallbackHtml();
    expect(html).toContain(MD_IMAGE_FALLBACK_CLASS);
    expect(html).toContain("#icon-image-off");
    expect(html).toContain(`aria-label="${MD_IMAGE_FALLBACK_LABEL}"`);
  });
});
