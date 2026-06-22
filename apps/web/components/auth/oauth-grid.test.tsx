import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserResp } from "@repo/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockWindowOpen = vi.fn();
vi.stubGlobal("open", mockWindowOpen);

import { OAuthGrid, _resetProvidersCache } from "./oauth-grid";

// jsdom 缺 window.matchMedia，OAuthGrid handleOAuthLogin 用它判断移动端 features，
// 不补会导致 TypeError 被 catch 吞掉、window.open 永不调用
function mockMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("max-width: 768px"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

// 每个测试前重置模块级 providers 缓存，确保 fetch 重新触发
beforeEach(() => {
  _resetProvidersCache();
  mockFetch.mockClear();
  mockWindowOpen.mockClear();
  mockMatchMedia();
});

/** 默认 providers 接口 mock：只启用 github */
function mockProviders(providers: string[] = ["github"]) {
  return { json: () => Promise.resolve({ code: 0, data: providers }) };
}

/** authorize 接口 mock */
function mockAuthorize(url: string) {
  return { json: () => Promise.resolve({ code: 0, data: { authorize_url: url } }) };
}

describe("OAuthGrid — 展示逻辑", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockProviders());
  });

  it("≤5 个 provider 时直接展示全部，无折叠按钮", () => {
    render(<OAuthGrid />);
    expect(screen.getByTitle("QQ")).toBeInTheDocument();
    expect(screen.getByTitle("GitHub")).toBeInTheDocument();
    expect(screen.getByTitle("微博")).toBeInTheDocument();
    expect(screen.getByTitle("Gitee")).toBeInTheDocument();
    expect(screen.getByTitle("百度")).toBeInTheDocument();
    expect(screen.queryByLabelText("展开更多登录方式")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("收起登录方式")).not.toBeInTheDocument();
  });

  it("不显示已移除的微信和 Google 按钮", () => {
    render(<OAuthGrid />);
    expect(screen.queryByTitle("微信")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Google")).not.toBeInTheDocument();
  });
});

describe("OAuthGrid — OAuth Popup 登录流程", () => {
  const mockSuccess = vi.fn();

  beforeEach(() => {
    mockSuccess.mockClear();
  });

  it("点击已启用的 provider 按钮后调用 authorize 接口并弹出 popup", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github", "gitee"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"));
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    // 等 providers 状态落地（GitHub 按钮启用、不再是 opacity-40 占位态）后再点击，
    // 否则点击会早于 enabledProviders 更新而被忽略
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
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
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"));
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    // 等 providers 状态落地（GitHub 按钮启用、不再是 opacity-40 占位态）后再点击，
    // 否则点击会早于 enabledProviders 更新而被忽略
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: mockUser },
        origin: window.location.origin,
      }),
    );

    expect(mockSuccess).toHaveBeenCalledWith(mockUser);
  });

  it("popup 被浏览器拦截时，不调用 onSuccess", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"));
    mockWindowOpen.mockReturnValue(null);

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    // 等 providers 状态落地（GitHub 按钮启用、不再是 opacity-40 占位态）后再点击，
    // 否则点击会早于 enabledProviders 更新而被忽略
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("GitHub"));

    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("不同 origin 的 postMessage 被忽略", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"));
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    // 等 providers 状态落地（GitHub 按钮启用、不再是 opacity-40 占位态）后再点击，
    // 否则点击会早于 enabledProviders 更新而被忽略
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: { id: 1, username: "vpt" } },
        origin: "https://evil.com",
      }),
    );

    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("未启用的 provider 点击后不调用 authorize 接口", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockProviders(["github"]));

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    await user.click(screen.getByLabelText("QQ"));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });
});
