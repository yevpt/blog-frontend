import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  initSessionFromRefreshToken,
  resetSessionInitForTests,
  syncCurrentUser,
} from "./session-init";
import { apiClient } from "./api";
import { useAuthStore } from "../store/auth";

vi.mock("./api", () => ({
  apiClient: { auth: { refresh: vi.fn() }, users: { getMe: vi.fn() } },
}));

describe("initSessionFromRefreshToken", () => {
  beforeEach(() => {
    resetSessionInitForTests();
    useAuthStore.setState({ accessToken: null, user: null });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("无 refresh_token 时不发起请求", async () => {
    await initSessionFromRefreshToken();

    expect(apiClient.auth.refresh).not.toHaveBeenCalled();
  });

  it("有 refresh_token 时换发 access_token", async () => {
    localStorage.setItem("refresh_token", "old-ref");
    vi.mocked(apiClient.auth.refresh).mockResolvedValue({
      access_token: "new-acc",
      refresh_token: "new-ref",
      expires_in: 7200,
    });
    vi.mocked(apiClient.users.getMe).mockResolvedValue({
      id: 1,
      username: "admin",
      nickname: "叶后台",
      email: "admin@example.com",
      status: 1,
      roles: ["admin"],
    });

    await initSessionFromRefreshToken();

    expect(apiClient.auth.refresh).toHaveBeenCalledWith({ refresh_token: "old-ref" });
    expect(apiClient.users.getMe).toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBe("new-acc");
    expect(useAuthStore.getState().user).toMatchObject({
      username: "admin",
      nickname: "叶后台",
      email: "admin@example.com",
    });
    expect(localStorage.getItem("refresh_token")).toBe("new-ref");
  });

  it("并发调用只发起一次 refresh 请求", async () => {
    localStorage.setItem("refresh_token", "ref");
    let resolveRefresh!: (value: {
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
      status: 1,
      roles: ["admin"],
    });

    const first = initSessionFromRefreshToken();
    const second = initSessionFromRefreshToken();

    expect(apiClient.auth.refresh).toHaveBeenCalledTimes(1);

    resolveRefresh({ access_token: "acc", refresh_token: "ref2", expires_in: 7200 });
    await Promise.all([first, second]);

    expect(apiClient.auth.refresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe("acc");
  });

  it("refresh 失败时清除 token 并允许重试", async () => {
    localStorage.setItem("refresh_token", "expired");
    vi.mocked(apiClient.auth.refresh).mockRejectedValueOnce(new Error("401"));
    vi.mocked(apiClient.auth.refresh).mockResolvedValueOnce({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
    });
    vi.mocked(apiClient.users.getMe).mockResolvedValue({
      id: 1,
      username: "admin",
      status: 1,
      roles: ["admin"],
    });

    await initSessionFromRefreshToken();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();

    localStorage.setItem("refresh_token", "new-ref");
    await initSessionFromRefreshToken();

    expect(apiClient.auth.refresh).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().accessToken).toBe("acc");
  });

  it("syncCurrentUser 写入 getMe 返回的完整资料", async () => {
    vi.mocked(apiClient.users.getMe).mockResolvedValue({
      id: 1,
      username: "admin",
      avatar_url: "https://cdn.test/avatar.png",
      status: 1,
      roles: ["admin"],
    });

    await syncCurrentUser();

    expect(useAuthStore.getState().user?.avatar_url).toBe("https://cdn.test/avatar.png");
  });
});
