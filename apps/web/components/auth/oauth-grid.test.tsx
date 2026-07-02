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

  it("postMessage 和 storage 事件都失联时，轮询 /api/users/me 兜底确认登录成功", async () => {
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "vpt" };
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"))
      // 第一次轮询：后端还没确认登录态
      .mockResolvedValueOnce({ ok: false } as Response)
      // 第二次轮询：登录态已生效
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUser) } as Response);
    mockWindowOpen.mockReturnValue({ closed: false });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    // 不触发 message / storage 事件，模拟 opener 与 window.name 均被 COOP 重置的场景
    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(mockUser), { timeout: 5000 });
    expect(mockFetch).toHaveBeenCalledWith("/api/users/me");
  }, 8000);

  it("popup.closed 被误判为 true 时轮询不应提前中止（回归用例）", async () => {
    // 复现真实故障：COOP 切断 opener 关联后，本窗口持有的 popup 引用同样失真，
    // popup.closed 可能从第一次检查起就一直误报 true（弹窗其实还在走第三方登录），
    // 此时轮询必须继续，不能因为 closed===true 就提前放弃，否则真正登录成功后也没人再确认
    const user = userEvent.setup();
    const mockUser: UserResp = { id: 1, username: "vpt" };
    mockFetch
      .mockResolvedValueOnce(mockProviders(["github"]))
      .mockResolvedValueOnce(mockAuthorize("https://github.com/login/oauth/authorize"))
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUser) } as Response);
    // 全程 closed: true，模拟 popup.closed 被浏览器误判
    mockWindowOpen.mockReturnValue({ closed: true });

    render(<OAuthGrid onSuccess={mockSuccess} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/oauth/providers"));
    await waitFor(() => expect(screen.getByLabelText("GitHub")).not.toHaveClass("opacity-40"));
    await user.click(screen.getByLabelText("GitHub"));
    await waitFor(() => expect(mockWindowOpen).toHaveBeenCalled());

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(mockUser), { timeout: 6500 });
    // 至少轮询了 3 次才成功，证明中间两次 ok:false 没有让轮询提前终止
    const meCalls = mockFetch.mock.calls.filter((c) => c[0] === "/api/users/me");
    expect(meCalls.length).toBeGreaterThanOrEqual(3);
  }, 9000);

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
