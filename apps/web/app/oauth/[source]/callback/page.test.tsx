import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import OAuthCallbackPage from "./page";
import { OAUTH_BROADCAST_CHANNEL } from "@/lib/oauth";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

describe("OAuth 回调接收页", () => {
  const mockPostMessage = vi.fn();
  const mockClose = vi.fn();
  const mockLocationReplace = vi.fn();
  let receivedBroadcasts: unknown[] = [];
  let listenerChannel: BroadcastChannel;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.NEXT_PUBLIC_APP_URL = "";

    vi.mocked(useParams).mockReturnValue({ source: "github" });
    vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<
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
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, replace: mockLocationReplace },
    });
    sessionStorage.setItem("oauth_return_url", "http://localhost/articles");

    // 模拟发起页：监听回调页会用的同一条 BroadcastChannel 频道
    receivedBroadcasts = [];
    listenerChannel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
    listenerChannel.onmessage = (event) => receivedBroadcasts.push(event.data);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    listenerChannel.close();
  });

  it("渲染加载中提示文字", () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {})); // 永不 resolve
    const { getByText } = render(<OAuthCallbackPage />);
    expect(getByText("正在处理登录，请稍候…")).toBeInTheDocument();
  });

  it("登录成功后：广播结果、尝试 postMessage 给 opener、并关闭自身", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { user: { id: 1, username: "vpt" } } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(receivedBroadcasts).toContainEqual({
        type: "oauth_success",
        user: { id: 1, username: "vpt" },
      }),
    );
    expect(mockPostMessage).toHaveBeenCalledWith(
      { type: "oauth_success", user: { id: 1, username: "vpt" } },
      window.location.origin,
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("后端返回错误时：广播错误消息", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 400, message: "state 校验失败" }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(receivedBroadcasts).toContainEqual({
        type: "oauth_error",
        message: "state 校验失败",
      }),
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("绑定成功后：广播 oauth_bind_success 并关闭自身", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { action: "bind" } }),
    } as Response);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(receivedBroadcasts).toContainEqual({ type: "oauth_bind_success", source: "github" }),
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("close() 300ms 后仍未生效（非真正 popup，如移动端整页跳转）：兜底走 sessionStorage 硬跳转", async () => {
    // 无 opener，模拟移动端全页跳转场景。jsdom 里 close() 本来就不会真的终止页面，
    // 这正好模拟真实浏览器里"这不是 popup，close() 被静默忽略"的情况
    Object.defineProperty(window, "opener", { writable: true, value: null });

    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ code: 0, data: { user: { id: 1, username: "vpt" } } }),
    } as Response);

    vi.useFakeTimers();
    try {
      render(<OAuthCallbackPage />);

      // advanceTimersByTimeAsync(0) 会在推进定时器的同时等待挂起的微任务，
      // 足够让 fetch().then().then() 这条链路跑完，且不受真实系统时钟抖动影响
      await vi.advanceTimersByTimeAsync(0);

      expect(mockClose).toHaveBeenCalled();
      // close() 刚调用完的这一刻，还不能立刻走跳转兜底——真正的 popup 这时应该已经被关闭了
      expect(mockLocationReplace).not.toHaveBeenCalled();

      // 300ms 后页面仍然存活（本测试模拟的就是这种情况），走兜底跳转
      await vi.advanceTimersByTimeAsync(300);

      expect(mockLocationReplace).toHaveBeenCalledWith("http://localhost/articles");
      const stored = JSON.parse(sessionStorage.getItem("oauth_result") ?? "{}");
      expect(stored.type).toBe("oauth_success");
      expect(stored.user.username).toBe("vpt");
    } finally {
      vi.useRealTimers();
    }
  });

  it("缺少 code 或 state 时，直接广播错误消息", async () => {
    const emptyParams = new URLSearchParams("");
    vi.mocked(useSearchParams).mockReturnValue(emptyParams as ReturnType<typeof useSearchParams>);

    render(<OAuthCallbackPage />);

    await waitFor(() =>
      expect(receivedBroadcasts).toContainEqual({
        type: "oauth_error",
        message: "缺少 OAuth 回调参数",
      }),
    );
    // 缺少参数时不应发起 fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
