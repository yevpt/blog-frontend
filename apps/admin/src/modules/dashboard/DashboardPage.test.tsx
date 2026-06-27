import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockState = vi.hoisted(() => ({
  getTrend: vi.fn().mockResolvedValue([
    { date: "2026-06-25", value: 100 },
    { date: "2026-06-26", value: 120 },
  ]),
  getDimensions: vi
    .fn()
    .mockResolvedValue([{ date: "2026-06-26", dim_value: "direct", pv: 100, uv: 50 }]),
  getPages: vi.fn().mockResolvedValue([{ path: "/a", title: "页面A", pv: 10, uv: 5 }]),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    analytics: {
      getOverview: vi.fn().mockResolvedValue({
        today_pv: 1284,
        today_uv: 612,
        online: 7,
        total_pv: 482910,
        total_uv: 96420,
        registered: { today_pv: 0, today_uv: 96 },
        anonymous: { today_pv: 0, today_uv: 516 },
      }),
      getTrend: mockState.getTrend,
      getDimensions: mockState.getDimensions,
      getPages: mockState.getPages,
      getOverviewSummary: vi.fn().mockResolvedValue({
        content: { articles: 128, categories: 12, tags: 46, music: 32, friend_links: 18 },
        interactions: { new_comments: 5, new_guestbook: 3, new_moments: 2 },
        users: { total: 1204, today_new: 8, today_active: 96 },
      }),
    },
  },
}));

import { DashboardPage } from "./DashboardPage";
import { useAuthStore } from "../../store/auth";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 26, 12));
    mockState.getTrend.mockClear();
    mockState.getDimensions.mockClear();
    mockState.getPages.mockClear();
    useAuthStore.setState({
      accessToken: "token",
      user: { id: 1, username: "admin", nickname: "叶后台" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("渲染欢迎语与关键数据块，并填充接口数据", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("你好，叶后台")).toBeInTheDocument();
    expect(screen.getByText("今日访问")).toBeInTheDocument();
    expect(screen.getByText("访问趋势")).toBeInTheDocument();
    expect(screen.getByText("站点概况")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "近 7 天" })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("1,284")).toBeInTheDocument());
    expect(screen.getByText("直接访问")).toBeInTheDocument();
    expect(screen.getByText("页面A")).toBeInTheDocument();
    expect(mockState.getTrend).toHaveBeenCalledWith({
      metric: "pv",
      from: "2026-06-20",
      to: "2026-06-26",
    });
    expect(mockState.getDimensions).toHaveBeenCalledWith("referer_type", {
      from: "2026-06-20",
      to: "2026-06-26",
    });
    expect(mockState.getPages).toHaveBeenCalledWith({
      limit: 5,
      from: "2026-06-20",
      to: "2026-06-26",
    });
  });

  it("切换时间范围后用新范围刷新概览分析数据", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "近 30 天" }));

    await waitFor(() =>
      expect(mockState.getTrend).toHaveBeenLastCalledWith({
        metric: "pv",
        from: "2026-05-28",
        to: "2026-06-26",
      }),
    );
  });

  it("站点概况与互动摘要链接到对应后台模块", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("站点概况")).toBeInTheDocument());

    expect(screen.getByRole("link", { name: "查看文章管理" })).toHaveAttribute("href", "/articles");
    expect(screen.getByRole("link", { name: "查看评论管理" })).toHaveAttribute("href", "/comments");
    expect(screen.getByRole("link", { name: "查看留言管理" })).toHaveAttribute(
      "href",
      "/guestbook",
    );
    expect(screen.getByRole("link", { name: "查看碎语管理" })).toHaveAttribute("href", "/moments");
    expect(screen.getAllByRole("link", { name: "查看用户管理" })[0]).toHaveAttribute(
      "href",
      "/users",
    );
  });
});
