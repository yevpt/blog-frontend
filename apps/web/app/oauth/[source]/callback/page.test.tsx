import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import OAuthCallbackPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

describe("OAuth 回调接收页", () => {
  const mockReplace = vi.fn();
  const mockPostMessage = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.NEXT_PUBLIC_APP_URL = "";

    vi.mocked(useParams).mockReturnValue({ source: "github" });
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as unknown as ReturnType<
      typeof useRouter
    >);

    // 默认携带正确参数
    const mockSearchParams = new URLSearchParams("code=abc&state=xyz");
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams as ReturnType<typeof useSearchParams>,
    );

    // 默认模拟为 popup 场景（window.opener 存在）
    Object.defineProperty(window, "opener", {
      writable: true,
      value: { closed: false, postMessage: mockPostMessage },
    });
    Object.defineProperty(window, "close", { writable: true, value: mockClose });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("渲染加载中提示文字", () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {})); // 永不 resolve
    const { getByText } = render(<OAuthCallbackPage />);
    expect(getByText("正在处理登录，请稍候…")).toBeInTheDocument();
  });

  it("Popup 模式：登录成功后 postMessage 给父窗口并关闭自身", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { user: { id: 1, username: "vpt" } } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_success", user: { id: 1, username: "vpt" } },
        window.location.origin,
      ),
    );
    expect(mockClose).toHaveBeenCalled();
    // Popup 模式不应触发路由跳转
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("Popup 模式：后端返回错误时 postMessage 错误消息", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "state 校验失败" }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_error", message: "state 校验失败" },
        window.location.origin,
      ),
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("直接导航模式（无 opener）：将结果存入 sessionStorage 并重定向至 /", async () => {
    // 模拟无 opener
    Object.defineProperty(window, "opener", { writable: true, value: null });

    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { user: { id: 1, username: "vpt" } } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    const stored = JSON.parse(sessionStorage.getItem("oauth_result") ?? "{}");
    expect(stored.type).toBe("oauth_success");
    expect(stored.user.username).toBe("vpt");
    // 无 opener 时不应调用 postMessage
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("Popup 模式：绑定成功后 postMessage 通知父窗口并关闭自身", async () => {
    vi.mocked(useParams).mockReturnValue({ source: "github" });
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { action: "bind" } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_bind_success", source: "github" },
        window.location.origin,
      ),
    );
    expect(mockClose).toHaveBeenCalled();
    // 绑定不写登录态，也不触发路由跳转
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("缺少 code 或 state 时，直接发送错误消息", async () => {
    const emptyParams = new URLSearchParams("");
    vi.mocked(useSearchParams).mockReturnValue(emptyParams as ReturnType<typeof useSearchParams>);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "oauth_error", message: "缺少 OAuth 回调参数" },
        window.location.origin,
      ),
    );
    // 缺少参数时不应发起 fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
