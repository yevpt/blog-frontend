import { afterEach, describe, expect, it, vi } from "vitest";
import { getCanonicalUrl, getSiteUrl } from "./seo";

describe("seo url helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("默认使用线上站点地址并去掉尾斜杠", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(getSiteUrl()).toBe("https://www.yevpt.com");
  });

  it("从 NEXT_PUBLIC_APP_URL 读取站点地址并规范 path", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");

    expect(getSiteUrl()).toBe("https://example.com");
    expect(getCanonicalUrl("/articles/1").toString()).toBe("https://example.com/articles/1");
    expect(getCanonicalUrl("moments").toString()).toBe("https://example.com/moments");
  });
});
