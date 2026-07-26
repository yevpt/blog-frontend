import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMonthDay,
  getDisplayYear,
  formatRelativeTime,
} from "./format-time";

describe("formatDate", () => {
  it("中文格式：六月 24, 2021", () => {
    expect(formatDate(new Date("2021-06-24T00:00:00"), "zh")).toBe("六月 24, 2021");
  });

  it("中文格式：一月 1, 2025", () => {
    expect(formatDate(new Date("2025-01-01T00:00:00"), "zh")).toBe("一月 1, 2025");
  });

  it("中文格式：十二月 31, 2023", () => {
    expect(formatDate(new Date("2023-12-31T00:00:00"), "zh")).toBe("十二月 31, 2023");
  });

  it("英文格式：December 26, 2025", () => {
    expect(formatDate(new Date("2025-12-26T00:00:00"), "en")).toBe("December 26, 2025");
  });

  it("英文格式：January 1, 2026", () => {
    expect(formatDate(new Date("2026-01-01T00:00:00"), "en")).toBe("January 1, 2026");
  });

  it("接受字符串类型的日期", () => {
    expect(formatDate("2021-06-24T00:00:00", "zh")).toBe("六月 24, 2021");
    expect(formatDate("2025-12-26T00:00:00", "en")).toBe("December 26, 2025");
  });
});

describe("formatDateTime", () => {
  it("格式化为 YYYY-MM-DD HH:mm（Asia/Shanghai）", () => {
    expect(formatDateTime("2020-04-17T07:54:00Z")).toBe("2020-04-17 15:54");
  });

  it("接受字符串类型的日期", () => {
    expect(formatDateTime("2020-04-17T07:54:00Z")).toBe("2020-04-17 15:54");
  });
});

describe("formatMonthDay", () => {
  it("格式化为 MM-DD（Asia/Shanghai），单位数补零", () => {
    expect(formatMonthDay("2020-04-07T07:54:00Z")).toBe("04-07");
  });

  it("跨时区日期按展示时区换算", () => {
    // UTC 2024-01-01 00:30 对应北京时间 08:30，仍为 01-01
    expect(formatMonthDay("2024-01-01T00:30:00Z")).toBe("01-01");
    // UTC 2024-06-30 16:30 对应北京时间 07-01 00:30
    expect(formatMonthDay("2024-06-30T16:30:00Z")).toBe("07-01");
  });

  it("接受 Date 对象", () => {
    expect(formatMonthDay(new Date("2021-12-24T00:00:00Z"))).toBe("12-24");
  });
});

describe("getDisplayYear", () => {
  it("返回展示时区下的年份", () => {
    expect(getDisplayYear("2024-06-24T00:00:00Z")).toBe(2024);
  });

  it("UTC 年末最后几小时换算到北京时已跨年", () => {
    // UTC 2023-12-31 16:30 → 北京 2024-01-01 00:30
    expect(getDisplayYear("2023-12-31T16:30:00Z")).toBe(2024);
  });

  it("接受 Date 对象", () => {
    expect(getDisplayYear(new Date("2021-06-24T00:00:00Z"))).toBe(2021);
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("刚刚：不足 1 分钟", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:30Z"));
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("刚刚");
  });

  it("X 分钟前", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:05:00Z"));
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("5 分钟前");
  });

  it("X 小时前", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T14:00:00Z"));
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("2 小时前");
  });

  it("X 天前", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-04T12:00:00Z"));
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("3 天前");
  });

  it("X 个月前", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-15T12:00:00Z"));
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("1 个月前");
  });

  it("X 年前", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("2 年前");
  });
});
