import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { ApiError } from "@repo/api";

// mock 全局 apiClient，避免真实 HTTP 请求
vi.mock("../lib/api", () => ({
  apiClient: { auth: { login: vi.fn() } },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("渲染登录表单", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText("用户名 / 邮箱")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("登录成功：更新 store 并写入 refresh_token", async () => {
    vi.mocked(apiClient.auth.login).mockResolvedValue({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
      user: { id: 1, username: "vpt" },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByPlaceholderText("用户名 / 邮箱"), "vpt");
    await userEvent.type(screen.getByPlaceholderText("密码"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe("acc");
      expect(localStorage.getItem("refresh_token")).toBe("ref");
    });
  });

  it("登录失败：展示错误消息", async () => {
    vi.mocked(apiClient.auth.login).mockRejectedValue(new ApiError(401, "用户名或密码错误"));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByPlaceholderText("用户名 / 邮箱"), "wrong");
    await userEvent.type(screen.getByPlaceholderText("密码"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("用户名或密码错误");
    });
  });
});
