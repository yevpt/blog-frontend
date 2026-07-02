import { describe, expect, it } from "vitest";
import {
  findRevisionImages,
  isMomentModerationContentType,
  isUgcModerationContentType,
  moderationContentMaxLength,
  resolveModerationImageRefs,
} from "./moderation-content";

describe("moderation-content", () => {
  it("识别 UGC 与碎语类型", () => {
    expect(isUgcModerationContentType("guestbook")).toBe(true);
    expect(isUgcModerationContentType("moment")).toBe(false);
    expect(isMomentModerationContentType("moment")).toBe(true);
    expect(isMomentModerationContentType("guestbook")).toBe(false);
  });

  it("将 object_key 替换为 access_url", () => {
    const content = "看图 ![cat](comments/article/3/images/cat.jpg)";
    const resolved = resolveModerationImageRefs(content, [
      {
        seq: 0,
        object_key: "comments/article/3/images/cat.jpg",
        access_url: "https://cdn.example.com/comments/article/3/images/cat.jpg",
        display_mode: "visible",
        media_type: "image/jpeg",
        is_gif: false,
      },
    ]);
    expect(resolved).toBe("看图 ![cat](https://cdn.example.com/comments/article/3/images/cat.jpg)");
  });

  it("moderationContentMaxLength 按类型区分", () => {
    expect(moderationContentMaxLength("moment")).toBe(800);
    expect(moderationContentMaxLength("guestbook")).toBe(2000);
  });

  it("findRevisionImages 按 revision_id 匹配", () => {
    const images = findRevisionImages(
      [
        {
          revision_id: 1,
          images: [
            {
              seq: 0,
              object_key: "a",
              access_url: "https://a",
              display_mode: "visible",
              media_type: "image/jpeg",
              is_gif: false,
            },
          ],
        },
        { revision_id: 2, images: [] },
      ],
      1,
    );
    expect(images).toHaveLength(1);
    expect(images[0]?.access_url).toBe("https://a");
  });
});
