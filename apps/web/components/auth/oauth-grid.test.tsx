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

  it("同源但结构不符的 postMessage（如浏览器扩展的握手消息）不应抢占结果、真正的消息仍需被处理（回归用例）", async () => {
    // 复现真实线上故障：React DevTools 等浏览器扩展的 content script 会定期向页面
    // 广播形如 { source: "react-devtools-content-script", hello: true } 的同源
    // postMessage。旧代码的 handleMessage 只校验了 event.origin，没校验消息结构，
    // 这类消息一旦先到，会通过 settled 标记提前"占位"、cleanup() 提前拆掉监听器，
    // 导致真正的 OAuth 结果消息到达时已经没有监听器在处理——登录弹窗永远收不到通知。
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

    // 先来一条同源但无关的扩展握手消息
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: "react-devtools-content-script", hello: true },
        origin: window.location.origin,
      }),
    );
    // 真正的 OAuth 结果消息随后到达，必须仍然生效
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "oauth_success", user: mockUser },
        origin: window.location.origin,
      }),
    );

    expect(mockSuccess).toHaveBeenCalledWith(mockUser);
  });

  it("window.opener 不可用时，改走 BroadcastChannel 也能调用 onSuccess", async () => {
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

    // 不触发 window message 事件，模拟 opener 已被切断；改用回调页会用的同一条
    // BroadcastChannel 频道广播结果
    const channel = new BroadcastChannel("oauth-result");
    channel.postMessage({ type: "oauth_success", user: mockUser });
    channel.close();

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(mockUser));
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
