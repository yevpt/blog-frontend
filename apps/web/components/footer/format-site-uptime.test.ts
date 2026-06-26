import { describe, expect, it } from "vitest";
import { formatSiteUptime, SITE_CREATED_AT } from "./format-site-uptime";

describe("formatSiteUptime", () => {
  it("建站当天显示 0", () => {
    expect(formatSiteUptime(SITE_CREATED_AT, SITE_CREATED_AT)).toBe("已运行 0 天 0 小时 0 分钟");
  });

  it("跨天、小时与分钟累计", () => {
    const now = new Date(2019, 11, 31, 2, 15);
    expect(formatSiteUptime(SITE_CREATED_AT, now)).toBe("已运行 1 天 2 小时 15 分钟");
  });

  it("now 早于 since 时归零", () => {
    expect(formatSiteUptime(SITE_CREATED_AT, new Date(2019, 11, 29))).toBe(
      "已运行 0 天 0 小时 0 分钟",
    );
  });
});
