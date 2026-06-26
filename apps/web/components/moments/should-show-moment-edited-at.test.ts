import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldShowMomentEditedAt } from "./should-show-moment-edited-at";

describe("shouldShowMomentEditedAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("未编辑时不展示", () => {
    expect(shouldShowMomentEditedAt("2026-05-30T09:00:00Z", "2026-05-30T09:00:00Z")).toBe(false);
  });

  it("旧帖近期编辑且相对文案不同则展示", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));

    expect(shouldShowMomentEditedAt("2021-06-26T12:00:00Z", "2026-06-25T12:00:00Z")).toBe(true);
  });

  it("发布与编辑相对文案一致时不展示（如均为 5 年前）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));

    expect(shouldShowMomentEditedAt("2021-06-26T12:00:00Z", "2021-07-01T12:00:00Z")).toBe(false);
  });

  it("编辑距今超过 30 天则不展示", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));

    expect(shouldShowMomentEditedAt("2021-06-26T12:00:00Z", "2026-04-20T12:00:00Z")).toBe(false);
  });

  it("发布与编辑间隔不足 1 天则不展示", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00Z"));

    expect(shouldShowMomentEditedAt("2026-06-25T12:00:00Z", "2026-06-25T20:00:00Z")).toBe(false);
  });
});
