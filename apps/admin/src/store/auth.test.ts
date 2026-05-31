import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth";

describe("useAuthStore", () => {
  // 每个测试前重置 store，防止测试间相互污染
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it("初始状态：accessToken 和 user 均为 null", () => {
    const { accessToken, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(user).toBeNull();
  });

  it("setAccessToken 更新 token", () => {
    useAuthStore.getState().setAccessToken("token-abc");
    expect(useAuthStore.getState().accessToken).toBe("token-abc");
  });

  it("setUser 更新用户信息", () => {
    const user = { id: 1, username: "vpt", roles: ["admin"] };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("logout 清除 accessToken 和 user", () => {
    useAuthStore.setState({ accessToken: "token", user: { id: 1, username: "vpt" } });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
