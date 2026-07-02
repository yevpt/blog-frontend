import { describe, expect, it } from "vitest";
import {
  getAuthorModerationDisplayContent,
  getAuthorMomentDisplayContent,
  getAuthorMomentDisplayImages,
  shouldShowModerationContentPlaceholder,
  shouldUseVisitorMomentPreviewSizing,
} from "./moderation-presentation";

describe("moderation-presentation author helpers", () => {
  it("非作者在中风险首次发布时显示占位", () => {
    expect(
      shouldShowModerationContentPlaceholder(
        {
          public_state: "placeholder",
          display_version: "none",
          has_pending_revision: true,
          can_interact: false,
        },
        false,
      ),
    ).toBe(true);
  });

  it("作者在中风险首次发布时不显示占位", () => {
    expect(
      shouldShowModerationContentPlaceholder(
        {
          public_state: "placeholder",
          display_version: "none",
          has_pending_revision: true,
          can_interact: false,
        },
        true,
      ),
    ).toBe(false);
  });

  it("作者优先展示 pending_content", () => {
    const moderation = {
      public_state: "placeholder" as const,
      display_version: "none" as const,
      has_pending_revision: true,
      pending_content: "待审正文",
      can_interact: false,
    };
    expect(
      getAuthorMomentDisplayContent({
        content: "",
        moderation,
      }),
    ).toBe("待审正文");
    expect(
      getAuthorModerationDisplayContent({
        content: "",
        moderation,
      }),
    ).toBe("待审正文");
  });

  it("作者待审占位优先展示 pending_images 原图", () => {
    const images = getAuthorMomentDisplayImages({
      images: [
        {
          id: 1,
          name: "blur.jpg",
          file_type: "jpg",
          url: "blur.jpg",
          access_url: "/blur.jpg",
          display_mode: "blurred",
          size: 1,
          seq: 1,
        },
      ],
      moderation: {
        public_state: "placeholder",
        display_version: "none",
        has_pending_revision: true,
        pending_images: [
          {
            id: 1,
            name: "orig.jpg",
            file_type: "jpg",
            url: "orig.jpg",
            access_url: "/orig.jpg",
            display_mode: "original",
            seq: 1,
          },
        ],
        can_interact: false,
      },
    });
    expect(images).toHaveLength(1);
    expect(images[0]?.access_url).toBe("/orig.jpg");
    expect(images[0]?.display_mode).toBe("original");
  });

  it("中风险编辑仍展示最后通过图片", () => {
    const images = getAuthorMomentDisplayImages({
      images: [
        {
          id: 1,
          name: "approved.jpg",
          file_type: "jpg",
          url: "approved.jpg",
          access_url: "/approved.jpg",
          display_mode: "original",
          size: 1,
          seq: 1,
        },
      ],
      moderation: {
        public_state: "visible",
        display_version: "last_approved",
        has_pending_revision: true,
        pending_images: [
          {
            id: 2,
            name: "pending.jpg",
            file_type: "jpg",
            url: "pending.jpg",
            access_url: "/pending.jpg",
            display_mode: "original",
            seq: 1,
          },
        ],
        can_interact: true,
      },
    });
    expect(images[0]?.access_url).toBe("/approved.jpg");
  });

  it("访客预览图启用撑满布局", () => {
    expect(
      shouldUseVisitorMomentPreviewSizing(false, [
        {
          id: 1,
          name: "a",
          file_type: "jpg",
          url: "a",
          access_url: "/a.jpg",
          display_mode: "blurred",
          size: 1,
          seq: 1,
        },
      ]),
    ).toBe(true);
  });
});
