import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
      getTrend: vi.fn().mockResolvedValue([
        { date: "2026-06-25", value: 100 },
        { date: "2026-06-26", value: 120 },
      ]),
      getDimensions: vi
        .fn()
        .mockResolvedValue([{ date: "2026-06-26", dim_value: "direct", pv: 100, uv: 50 }]),
      getPages: vi.fn().mockResolvedValue([{ path: "/a", title: "页面A", pv: 10, uv: 5 }]),
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
    useAuthStore.setState({
      accessToken: "token",
      user: { id: 1, username: "admin", nickname: "叶后台" },
    });
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

    await waitFor(() => expect(screen.getByText("1,284")).toBeInTheDocument());
    expect(screen.getByText("直接访问")).toBeInTheDocument();
    expect(screen.getByText("页面A")).toBeInTheDocument();
  });
});
