import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserResp } from "@repo/api";
import { OAuthGrid } from "./oauth-grid";

// 全局 mock fetch 和 window.open
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockWindowOpen = vi.fn();
vi.stubGlobal("open", mockWindowOpen);

describe("OAuthGrid — 展开/收起", () => {
  it("渲染 4 个主要 provider + 展开按钮", () => {
    render(<OAuthGrid />);
    expect(screen.getByTitle("微信")).toBeInTheDocument();
    expect(screen.getByTitle("QQ")).toBeInTheDocument();
    expect(screen.getByTitle("GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("Google")).toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
  });

  it("点击展开按钮后显示全部 7 个 provider，展开按钮消失", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    expect(screen.getByTitle("Gitee")).toBeInTheDocument();
    expect(screen.getByTitle("百度")).toBeInTheDocument();
    expect(screen.queryByLabelText("展开更多登录方式")).not.toBeInTheDocument();
    expect(screen.getByLabelText("收起登录方式")).toBeInTheDocument();
  });

  it("展开后点击收起按钮可折叠回 4 个 provider", async () => {
    const user = userEvent.setup();
    render(<OAuthGrid />);
    await user.click(screen.getByLabelText("展开更多登录方式"));
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    await user.click(screen.getByLabelText("收起登录方式"));
    expect(screen.queryByTitle("微博")).not.toBeInTheDocument();
    expect(screen.getByLabelText("展开更多登录方式")).toBeInTheDocument();
  });
});

describe("OAuthGrid — GitHub Popup 登录流程", () => {
  const mockSuccess = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    mockWindowOpen.mockClear();
    mockSuccess.mockClear();
  });

  it("点击 GitHub 按钮后调用 authorize 接口并弹出 popup", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/oauth/github/authorize"),
      ),
    );
    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://github.com/login/oauth/authorize",
      "oauth_popup",
      expect.any(String),
    );
  });

  it("收到 oauth_success postMessage 时调用 onSuccess", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "vpt" };
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    // 模拟 popup 回调页发来的 postMessage
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: mockUser },
        origin: window.location.origin,
      }),
    );

    expect(mockSuccess).toHaveBeenCalledWith(mockUser);
  });

  it("popup 被浏览器拦截时，不打开 popup，也不调用 onSuccess", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    // window.open 返回 null 表示 popup 被浏览器拦截
    mockWindowOpen.mockReturnValue(null);

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));

    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("不同 origin 的 postMessage 被忽略", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { authorize_url: "https://github.com/login/oauth/authorize" },
        }),
    });
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    // 来自不同 origin 的消息应被忽略
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: { id: 1, username: "vpt" } },
        origin: "https://evil.com",
      }),
    );

    expect(mockSuccess).not.toHaveBeenCalled();
  });
});
