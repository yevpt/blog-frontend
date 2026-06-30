import { describe, expect, it } from "vitest";
import type { MomentItemResp } from "@repo/api";
import {
  enrichMomentFromPublish,
  mergePageWithPublishedMoment,
  momentHasPublishableMedia,
} from "./enrich-moment-from-publish";

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 7,
    content: "碎语",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 0,
    comment_count: 0,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

const pendingImage = {
  id: 10,
  name: "orig.jpg",
  file_type: "jpg",
  url: "orig.jpg",
  access_url: "/orig.jpg",
  display_mode: "original" as const,
  seq: 1,
};

describe("enrichMomentFromPublish", () => {
  it("列表项缺图时用发布响应补齐 pending_images", () => {
    const fetched = makeMoment({
      id: 99,
      moderation: {
        public_state: "placeholder",
        display_version: "none",
        has_pending_revision: true,
        can_interact: false,
      },
    });
    const published = makeMoment({
      id: 99,
      moderation: {
        public_state: "placeholder",
        display_version: "none",
        has_pending_revision: true,
        pending_images: [pendingImage],
        can_interact: false,
      },
    });

    const merged = enrichMomentFromPublish(fetched, published);
    expect(momentHasPublishableMedia(merged)).toBe(true);
    expect(merged.moderation?.pending_images).toHaveLength(1);
  });

  it("列表项已有图片时不覆盖", () => {
    const fetched = makeMoment({
      id: 99,
      images: [
        {
          id: 1,
          name: "a.jpg",
          file_type: "jpg",
          url: "a.jpg",
          access_url: "/a.jpg",
          display_mode: "original",
          size: 1,
          seq: 1,
        },
      ],
    });
    const published = makeMoment({
      id: 99,
      moderation: {
        public_state: "placeholder",
        display_version: "none",
        has_pending_revision: true,
        pending_images: [pendingImage],
        can_interact: false,
      },
    });

    expect(enrichMomentFromPublish(fetched, published).images[0]?.access_url).toBe("/a.jpg");
  });

  it("id 不匹配时不合并", () => {
    const fetched = makeMoment({ id: 1 });
    const published = makeMoment({
      id: 2,
      moderation: {
        public_state: "placeholder",
        display_version: "none",
        has_pending_revision: true,
        pending_images: [pendingImage],
        can_interact: false,
      },
    });

    expect(enrichMomentFromPublish(fetched, published)).toEqual(fetched);
  });
});

describe("mergePageWithPublishedMoment", () => {
  it("只合并列表中匹配 id 的条目", () => {
    const published = makeMoment({
      id: 2,
      moderation: {
        public_state: "placeholder",
        display_version: "none",
        has_pending_revision: true,
        pending_images: [pendingImage],
        can_interact: false,
      },
    });

    const merged = mergePageWithPublishedMoment(
      {
        total: 2,
        pages: 1,
        page: 1,
        page_size: 20,
        list: [makeMoment({ id: 1 }), makeMoment({ id: 2 })],
      },
      published,
    );

    expect(merged.list[0]?.moderation?.pending_images).toBeUndefined();
    expect(merged.list[1]?.moderation?.pending_images).toHaveLength(1);
  });
});
