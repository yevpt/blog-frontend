import { describe, expect, it } from "vitest";
import {
  computeMomentSingleImageDisplaySize,
  getMomentImageDisplayUrl,
  isVisitorModerationPreviewImage,
  MOMENT_SINGLE_IMAGE_MAX_HEIGHT,
  MOMENT_SINGLE_IMAGE_MAX_WIDTH,
} from "./moment-image-display";

describe("computeMomentSingleImageDisplaySize", () => {
  it("横图按最大宽度等比缩放", () => {
    expect(computeMomentSingleImageDisplaySize(1600, 900)).toEqual({ width: 480, height: 270 });
  });

  it("竖图按最大高度等比缩放", () => {
    expect(computeMomentSingleImageDisplaySize(900, 1600)).toEqual({ width: 180, height: 320 });
  });

  it("小图不放大", () => {
    expect(computeMomentSingleImageDisplaySize(200, 150)).toEqual({ width: 200, height: 150 });
  });

  it("无效尺寸回退到最大展示框", () => {
    expect(computeMomentSingleImageDisplaySize(0, 0)).toEqual({
      width: MOMENT_SINGLE_IMAGE_MAX_WIDTH,
      height: MOMENT_SINGLE_IMAGE_MAX_HEIGHT,
    });
  });
});

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
