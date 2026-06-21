import { describe, it, expect } from "vitest";
import {
  findSocialLink,
  getDisplaySocialLinks,
  getProfileContactLinks,
  normalizeSocialPlatform,
  toBackendSocialPlatform,
} from "./profile-config";

describe("profile-config social platform mapping", () => {
  it("normalizeSocialPlatform 将后端 sina/bili 映射为前端 key", () => {
    expect(normalizeSocialPlatform("sina")).toBe("weibo");
    expect(normalizeSocialPlatform("bili")).toBe("bilibili");
    expect(normalizeSocialPlatform("github")).toBe("github");
  });

  it("toBackendSocialPlatform 将前端 field 映射为后端 API key", () => {
    expect(toBackendSocialPlatform("weibo")).toBe("sina");
    expect(toBackendSocialPlatform("bilibili")).toBe("bili");
    expect(toBackendSocialPlatform("github")).toBe("github");
  });

  it("findSocialLink 能按后端 platform 别名找到链接", () => {
    const link = findSocialLink([{ platform: "sina", url: "https://weibo.com/u/1" }], "weibo");
    expect(link?.url).toBe("https://weibo.com/u/1");
  });

  it("getDisplaySocialLinks 归一化并过滤可展示链接", () => {
    expect(
      getDisplaySocialLinks([
        { platform: "sina", url: "https://weibo.com/u/1" },
        { platform: "unknown", url: "https://example.com" },
      ]),
    ).toEqual([{ platform: "weibo", url: "https://weibo.com/u/1" }]);
  });

  it("getProfileContactLinks 包含对外展示邮箱", () => {
    expect(
      getProfileContactLinks({
        site: null,
        display_email: "hello@example.com",
        social_links: [],
      }),
    ).toEqual([
      {
        key: "email",
        platform: "email",
        url: "mailto:hello@example.com",
        tooltipDescription: "hello@example.com",
      },
    ]);
  });

  it("getProfileContactLinks 顺序为站点、邮箱、社交链接", () => {
    expect(
      getProfileContactLinks({
        site: "https://example.com",
        display_email: "hello@example.com",
        social_links: [{ platform: "github", url: "https://github.com/test" }],
      }).map((link) => link.platform),
    ).toEqual(["site", "email", "github"]);
  });
});
