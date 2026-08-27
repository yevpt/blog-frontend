import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockState = vi.hoisted(() => ({
  getTrend: vi.fn().mockResolvedValue([{ date: "2026-06-26", value: 12 }]),
  getDimensions: vi.fn().mockResolvedValue([]),
  getPages: vi.fn().mockResolvedValue([]),
  getFriendLinks: vi.fn().mockResolvedValue([]),
  getRealtime: vi.fn().mockResolvedValue({ online: 0, recent_paths: [] }),
  getPaths: vi.fn().mockResolvedValue([]),
  getFunnel: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    analytics: mockState,
  },
}));

import { AnalyticsPage } from "./AnalyticsPage";

beforeAll(() => {
  if (!HTMLElement.prototype.getAnimations) {
    HTMLElement.prototype.getAnimations = () => [];
  }
});

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 26, 12));
    for (const mockFn of Object.values(mockState)) {
      mockFn.mockClear();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("默认用近 7 天范围加载各分析 Tab 数据", async () => {
    const user = userEvent.setup();

    render(<AnalyticsPage />);

    expect(screen.getByRole("tab", { name: "近 7 天" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "数据统计分类" })).toHaveClass(
      "w-full",
      "border-border/70",
    );
    expect(screen.getByRole("region", { name: "数据维护" })).toBeInTheDocument();

    await waitFor(() =>
      expect(mockState.getTrend).toHaveBeenCalledWith({
        metric: "pv",
        segment: "all",
        from: "2026-06-20",
        to: "2026-06-26",
      }),
    );
    await user.click(screen.getByRole("tab", { name: "受众与来源" }));
    await waitFor(() =>
      expect(mockState.getDimensions).toHaveBeenCalledWith("referer_type", {
        from: "2026-06-20",
        to: "2026-06-26",
      }),
    );
    await user.click(screen.getByRole("tab", { name: "页面" }));
    await waitFor(() =>
      expect(mockState.getPages).toHaveBeenCalledWith({
        limit: 30,
        from: "2026-06-20",
        to: "2026-06-26",
      }),
    );
    await user.click(screen.getByRole("tab", { name: "友链" }));
    await waitFor(() =>
      expect(mockState.getFriendLinks).toHaveBeenCalledWith({
        limit: 30,
        from: "2026-06-20",
        to: "2026-06-26",
      }),
    );
    await user.click(screen.getByRole("tab", { name: "路径漏斗" }));
    await waitFor(() =>
      expect(mockState.getPaths).toHaveBeenCalledWith({
        limit: 20,
        from: "2026-06-20",
        to: "2026-06-26",
      }),
    );
  });

  it("切换近 30 天后把范围下发给当前分析请求", async () => {
    const user = userEvent.setup();

    render(<AnalyticsPage />);

    await user.click(screen.getByRole("tab", { name: "近 30 天" }));

    await waitFor(() =>
      expect(mockState.getTrend).toHaveBeenLastCalledWith({
        metric: "pv",
        segment: "all",
        from: "2026-05-28",
        to: "2026-06-26",
      }),
    );
  });
});
