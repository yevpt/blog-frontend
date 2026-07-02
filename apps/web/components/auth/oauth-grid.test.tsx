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
function mockMatchMedia(mobile = false) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: mobile && q.includes("max-width: 768px"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

const defaultLocation = window.location;

// 每个测试前重置模块级 providers 缓存，确保 fetch 重新触发
beforeEach(() => {
  _resetProvidersCache();
  mockFetch.mockClear();
  mockWindowOpen.mockClear();
  sessionStorage.clear();
  localStorage.clear();
  Object.defineProperty(window, "location", { writable: true, value: defaultLocation });
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

  it("移动端使用全页跳转而非 popup", async () => {
    const user = userEvent.setup();
    const assignMock = vi.fn();
    const mockHref = "http://localhost/login";
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, href: mockHref, assign: assignMock },
    });
    mockMatchMedia(true);

    mockFetch
      .mockResolvedValueOnce(mockProviders(["qq"]))
      .mockResolvedValueOnce(mockAuthorize("https://graph.qq.com/oauth2.0/authorize"));

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    await waitFor(() => expect(screen.getByLabelText("QQ")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("QQ"));

    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith("https://graph.qq.com/oauth2.0/authorize"),
    );
    expect(mockWindowOpen).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("oauth_return_url")).toBe(mockHref);
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

  it("opener 被 COOP 切断时，回调页改走 storage 事件也能调用 onSuccess", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "vpt" };
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"));
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    localStorage.setItem("oauth_result", JSON.stringify({ type: "oauth_success", user: mockUser }));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "oauth_result",
        newValue: JSON.stringify({ type: "oauth_success", user: mockUser }),
      }),
    );

    expect(mockSuccess).toHaveBeenCalledWith(mockUser);
    expect(localStorage.getItem("oauth_result")).toBeNull();
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
