import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteUptime } from "./site-uptime";

describe("SiteUptime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 26, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("挂载后展示运行时间", () => {
    render(<SiteUptime />);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByText(/已运行 \d+ 天 \d+ 小时 \d+ 分钟/)).toBeTruthy();
  });

  it("按分钟刷新文案", () => {
    render(<SiteUptime />);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    const initialText = screen.getByText(/已运行/).textContent;

    vi.setSystemTime(new Date(2026, 5, 26, 12, 5, 0));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/已运行/).textContent).not.toBe(initialText);
  });
});
