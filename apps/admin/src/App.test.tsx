import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { apiClient } from "./lib/api";
import { resetSessionInitForTests } from "./lib/session-init";
import { useAuthStore } from "./store/auth";

vi.mock("./lib/api", () => ({
  apiClient: {
    auth: { refresh: vi.fn() },
    adminAuth: { login: vi.fn() },
    users: { getMe: vi.fn() },
  },
}));

describe("App", () => {
  beforeEach(() => {
    resetSessionInitForTests();
    useAuthStore.setState({ accessToken: null, user: null });
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = "theme=; Max-Age=0; path=/";
    document.documentElement.classList.remove("dark", "light");
    window.history.pushState({}, "", "/");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("刷新受保护页面时等待静默续期完成后显示后台", async () => {
    localStorage.setItem("refresh_token", "old-ref");
    let resolveRefresh!: (tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }) => void;
    vi.mocked(apiClient.auth.refresh).mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    vi.mocked(apiClient.users.getMe).mockResolvedValue({
      id: 1,
      username: "admin",
      nickname: "叶后台",
      email: "admin@example.com",
      status: 1,
      roles: ["admin"],
    });

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("正在恢复登录状态");
    expect(screen.queryByRole("heading", { name: "登录后台" })).not.toBeInTheDocument();

    resolveRefresh({ access_token: "new-acc", refresh_token: "new-ref", expires_in: 7200 });

    expect(await screen.findByRole("heading", { name: "你好，叶后台" })).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe("new-acc");
    expect(useAuthStore.getState().user?.email).toBe("admin@example.com");
    expect(localStorage.getItem("refresh_token")).toBe("new-ref");
    expect(window.location.pathname).toBe("/");
  });
});
