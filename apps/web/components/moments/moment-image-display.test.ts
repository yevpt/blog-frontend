import { describe, expect, it } from "vitest";
import { getMomentImageDisplayUrl, isVisitorModerationPreviewImage } from "./moment-image-display";

describe("getMomentImageDisplayUrl", () => {
  it("作者原图不追加 CDN 变换", () => {
    expect(
      getMomentImageDisplayUrl(
        { access_url: "https://cdn.example.com/moments/a.jpg", display_mode: "original" },
        false,
      ),
    ).toBe("https://cdn.example.com/moments/a.jpg");
  });

  it("访客待审模糊预览放大到卡片展示宽度", () => {
    const url = getMomentImageDisplayUrl(
      {
        access_url: "https://cdn.example.com/moderation/previews/a.jpg",
        display_mode: "blurred",
      },
      true,
    );
    expect(url).toContain("w=480");
    expect(url.startsWith("https://cdn.example.com/moderation/previews/a.jpg")).toBe(true);
  });

  it("相对路径可追加 CDN 变换", () => {
    const url = getMomentImageDisplayUrl(
      { access_url: "/moderation/previews/a.jpg", display_mode: "blurred" },
      true,
    );
    expect(url).toContain("w=480");
    expect(url).toContain("/moderation/previews/a.jpg");
  });
});

describe("isVisitorModerationPreviewImage", () => {
  it("识别模糊预览", () => {
    expect(
      isVisitorModerationPreviewImage({
        access_url: "/a.jpg",
        display_mode: "blurred",
      }),
    ).toBe(true);
  });
});
