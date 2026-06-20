import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { useAuthStore } from "../../store/auth";

describe("DashboardPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "token",
      user: { id: 1, username: "admin", nickname: "叶后台" },
    });
  });

  it("渲染欢迎语、统计卡片与最近文章", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "你好，叶后台" })).toBeInTheDocument();
    expect(screen.getByText("文章总数")).toBeInTheDocument();
    expect(screen.getByText("分类数")).toBeInTheDocument();
    expect(screen.getByText("最近文章")).toBeInTheDocument();
    expect(screen.getByText("Vite 管理后台的主题方案")).toBeInTheDocument();
    expect(screen.getByText("快捷入口")).toBeInTheDocument();
  });
});
