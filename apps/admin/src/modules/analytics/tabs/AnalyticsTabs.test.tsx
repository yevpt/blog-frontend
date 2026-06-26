import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { toastQueue } from "../../../lib/toast";
import { AudienceTab } from "./AudienceTab";
import { FriendsTab } from "./FriendsTab";
import { PagesTab } from "./PagesTab";
import { PathsTab } from "./PathsTab";
import { RealtimeTab } from "./RealtimeTab";
import { TrendTab } from "./TrendTab";

const mockState = vi.hoisted(() => ({
  getTrend: vi.fn(),
  getDimensions: vi.fn(),
  getPages: vi.fn(),
  getFriendLinks: vi.fn(),
  getRealtime: vi.fn(),
  getPaths: vi.fn(),
  getFunnel: vi.fn(),
}));

vi.mock("../../../lib/api", () => ({
  apiClient: {
    analytics: mockState,
  },
}));

vi.mock("../components/TrendChart", () => ({
  TrendChart: ({ data }: { data: Array<{ date: string; value: number }> }) => (
    <div data-testid="trend-chart">趋势点 {data.length}</div>
  ),
}));

const range = { from: "2026-06-20", to: "2026-06-26" };

describe("analytics tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockState.getTrend.mockResolvedValue([{ date: "2026-06-26", value: 12 }]);
    mockState.getDimensions.mockResolvedValue([
      { date: "2026-06-25", dim_value: "direct", pv: 10, uv: 5 },
      { date: "2026-06-26", dim_value: "direct", pv: 5, uv: 3 },
    ]);
    mockState.getPages.mockResolvedValue([{ path: "/articles", title: "文章", pv: 20, uv: 9 }]);
    mockState.getFriendLinks.mockResolvedValue([
      {
        friend_link_id: 1,
        friend_name: "VPT",
        site: "https://vpt.im",
        site_host: "vpt.im",
        pv: 8,
        uv: 4,
        sessions: 3,
        inbound_rate: 0.125,
      },
    ]);
    mockState.getRealtime.mockResolvedValue({
      online: 3,
      recent_paths: [{ path: "/about", active: 2 }],
    });
    mockState.getPaths.mockResolvedValue([{ sequence: ["/", "/articles"], sessions: 6 }]);
    mockState.getFunnel.mockResolvedValue([
      { step: "/", sessions: 10, conversion_rate: 1 },
      { step: "/articles", sessions: 4, conversion_rate: 0.4 },
    ]);
  });

  it("TrendTab 默认请求 PV 趋势，切换指标后重新取数", async () => {
    const user = userEvent.setup();
    render(<TrendTab range={range} />);

    await waitFor(() =>
      expect(apiClient.analytics.getTrend).toHaveBeenCalledWith({
        metric: "pv",
        segment: "all",
        ...range,
      }),
    );
    expect(await screen.findByTestId("trend-chart")).toHaveTextContent("趋势点 1");

    await user.click(screen.getByRole("button", { name: "访客" }));

    await waitFor(() =>
      expect(apiClient.analytics.getTrend).toHaveBeenLastCalledWith({
        metric: "uv",
        segment: "all",
        ...range,
      }),
    );
  });

  it("AudienceTab 汇总同一维度值，并支持切换维度", async () => {
    const user = userEvent.setup();
    render(<AudienceTab range={range} />);

    await waitFor(() =>
      expect(apiClient.analytics.getDimensions).toHaveBeenCalledWith("referer_type", range),
    );
    expect(await screen.findByText("直接访问")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设备" }));

    await waitFor(() =>
      expect(apiClient.analytics.getDimensions).toHaveBeenLastCalledWith("device", range),
    );
  });

  it("PagesTab 渲染热门页面排行并传递 limit", async () => {
    render(<PagesTab range={range} />);

    await waitFor(() =>
      expect(apiClient.analytics.getPages).toHaveBeenCalledWith({ limit: 30, ...range }),
    );
    expect(await screen.findByText("文章")).toBeInTheDocument();
    expect(screen.getByText("/articles")).toBeInTheDocument();
  });

  it("FriendsTab 渲染友链入站占比", async () => {
    render(<FriendsTab range={range} />);

    await waitFor(() =>
      expect(apiClient.analytics.getFriendLinks).toHaveBeenCalledWith({ limit: 30, ...range }),
    );
    expect(await screen.findByText("VPT")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
  });

  it("RealtimeTab 加载当前在线与最近活跃路径", async () => {
    render(<RealtimeTab />);

    await waitFor(() => expect(apiClient.analytics.getRealtime).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("/about")).toBeInTheDocument();
  });

  it("PathsTab 渲染路径序列并计算自定义漏斗", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PathsTab range={range} />
        <ToastRegion queue={toastQueue} />
      </>,
    );

    await waitFor(() =>
      expect(apiClient.analytics.getPaths).toHaveBeenCalledWith({ limit: 20, ...range }),
    );
    expect(await screen.findByText("/ → /articles")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "计算漏斗" }));

    await waitFor(() =>
      expect(apiClient.analytics.getFunnel).toHaveBeenCalledWith(["/", "/articles"], range),
    );
    expect(await screen.findByText("10 会话 · 100.0%")).toBeInTheDocument();
  });
});
