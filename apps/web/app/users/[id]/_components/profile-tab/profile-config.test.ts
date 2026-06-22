import { describe, it, expect } from "vitest";
import {
  findSocialLink,
  getDisplaySocialLinks,
  getProfileContactLinks,
  normalizeSocialPlatform,
  toBackendSocialPlatform,
  validateDescription,
  validateMark,
  validateNickname,
  validateUrlLen,
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

describe("profile-config 字段长度校验（镜像后端 binding:max）", () => {
  it("validateNickname: 空值报错，>30 报错，<=30 通过", () => {
    expect(validateNickname("")).toBe("昵称不能为空");
    expect(validateNickname("   ")).toBe("昵称不能为空");
    expect(validateNickname("x".repeat(31))).toBe("最多 30 个字符");
    expect(validateNickname("x".repeat(30))).toBeNull();
    expect(validateNickname("正常昵称")).toBeNull();
  });

  it("validateMark: >30 报错，<=30 通过（空值允许）", () => {
    expect(validateMark("x".repeat(31))).toBe("最多 30 个字符");
    expect(validateMark("x".repeat(30))).toBeNull();
    expect(validateMark("")).toBeNull();
  });

  it("validateDescription: >200 报错，<=200 通过（空值允许）", () => {
    expect(validateDescription("x".repeat(201))).toBe("最多 200 个字符");
    expect(validateDescription("x".repeat(200))).toBeNull();
    expect(validateDescription("")).toBeNull();
  });

  it("validateUrlLen: >200 报错，<=200 通过，非法 URL 报错", () => {
    // 合法 URL 但长度 >200
    const longUrl = `https://example.com/${"x".repeat(190)}`;
    expect(longUrl.length).toBeGreaterThan(200);
    expect(validateUrlLen(longUrl)).toBe("最多 200 个字符");
    // 合法 URL 且长度 <=200
    expect(validateUrlLen("https://example.com")).toBeNull();
    expect(validateUrlLen("")).toBeNull();
    // 非法 URL
    expect(validateUrlLen("not-a-url")).toBe("请输入有效的链接（如 https://...）");
  });
});
