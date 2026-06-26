import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsRangeControl } from "./AnalyticsRangeControl";
import type { AnalyticsRangeState } from "../hooks/use-analytics-range";

function createRange(overrides: Partial<AnalyticsRangeState> = {}): AnalyticsRangeState {
  return {
    preset: "7d",
    customFrom: "2026-06-20",
    customTo: "2026-06-26",
    query: { from: "2026-06-20", to: "2026-06-26" },
    label: "近 7 天",
    setPreset: vi.fn(),
    setCustomFrom: vi.fn(),
    setCustomTo: vi.fn(),
    ...overrides,
  };
}

describe("AnalyticsRangeControl", () => {
  it("渲染三个范围选项，并切换预设", async () => {
    const user = userEvent.setup();
    const setPreset = vi.fn();

    render(<AnalyticsRangeControl range={createRange({ setPreset })} />);

    expect(screen.getByRole("button", { name: "近 7 天" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "近 30 天" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自定义" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "近 30 天" }));

    expect(setPreset).toHaveBeenCalledWith("30d");
  });

  it("自定义范围时显示起止日期选择", () => {
    render(<AnalyticsRangeControl range={createRange({ preset: "custom" })} />);

    expect(screen.getByText("起始日期")).toBeInTheDocument();
    expect(screen.getByText("结束日期")).toBeInTheDocument();
  });
});
