import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart } from "./TrendChart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }: { data: Array<unknown>; children: React.ReactNode }) => (
    <div data-testid="line-chart" data-count={data.length}>
      {children}
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid="line" data-key={dataKey} />,
}));

describe("TrendChart", () => {
  it("把趋势点交给折线图并使用 value 作为数据键", () => {
    render(
      <TrendChart
        data={[
          { date: "2026-06-25", value: 8 },
          { date: "2026-06-26", value: 12 },
        ]}
      />,
    );

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-count", "2");
    expect(screen.getByTestId("line")).toHaveAttribute("data-key", "value");
  });
});
