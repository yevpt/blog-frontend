import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginModal } from "./login-modal";
import { useLoginModal } from "@/store/use-login-modal";
import { _resetProvidersCache } from "./oauth-grid";

const mockAddToast = vi.fn();
vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

vi.mock("@repo/hooks", async () => {
  const actual = await vi.importActual("@repo/hooks");
  return {
    ...(actual as object),
    compressAvatarImage: vi.fn(async (file: File) => file),
  };
});

// next/navigation 的 useRouter 在 jsdom 测试环境中不可用，需要 mock
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

beforeEach(() => {
  _resetProvidersCache();
  useLoginModal.setState({ isOpen: false, view: "login" });
  mockRefresh.mockClear();
  mockAddToast.mockClear();
});

describe("LoginModal", () => {
  it("isOpen=false 时不渲染 dialog", () => {
    render(<LoginModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("isOpen=true 时渲染弹窗并显示登录视图", () => {
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("欢迎回来")).toBeInTheDocument();
  });

  it("isOpen=true, view=register 时显示注册视图", () => {
    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);
    expect(screen.getByRole("heading", { name: "创建账号" })).toBeInTheDocument();
  });

  it("登录视图：返回按钮点击关闭弹窗", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    await user.click(screen.getByLabelText("关闭登录弹窗"));
    await waitFor(() => expect(useLoginModal.getState().isOpen).toBe(false));
  });

  it("注册视图：返回按钮点击关闭弹窗", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);
    await user.click(screen.getByLabelText("关闭登录弹窗"));
    await waitFor(() => expect(useLoginModal.getState().isOpen).toBe(false));
  });

  it("点击遮罩不关闭弹窗，并触发轻微抖动反馈", () => {
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(useLoginModal.getState().isOpen).toBe(true);
    expect(screen.getByRole("dialog").parentElement?.parentElement?.className).toContain(
      "animate-modal-pulse",
    );
  });

  it("点击「注册」标签切换到注册视图", async () => {
    const user = userEvent.setup();
    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);
    await user.click(screen.getByRole("button", { name: "注册" }));
    expect(useLoginModal.getState().view).toBe("register");
  });

  it("登录成功后关闭弹窗并触发 router.refresh", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: 0,
          data: { user: { id: 1, username: "alice", nickname: "Alice" } },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    useLoginModal.setState({ isOpen: true, view: "login" });
    render(<LoginModal />);

    await user.type(screen.getByPlaceholderText("账号 / 邮箱 / 手机号"), "test@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: /继续/ }));

    await waitFor(() => expect(useLoginModal.getState().isOpen).toBe(false));
    expect(mockRefresh).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("注册成功后自动登录、关闭弹窗并显示欢迎 toast", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn(async (url: string) => {
      if (url === "/api/oauth/providers") {
        return mockApiResponse(["github"]);
      }
      if (url === "/api/auth/register") {
        return mockApiResponse({
          user: { id: 1, username: "user@example.com", nickname: "Alice" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", mockFetch);

    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);

    await user.type(screen.getByPlaceholderText("邮箱地址"), "user@example.com");
    await user.type(screen.getByPlaceholderText("设置密码"), "password1");
    await user.type(screen.getByPlaceholderText("验证码"), "123456");
    await user.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => expect(useLoginModal.getState().isOpen).toBe(false));
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockAddToast).toHaveBeenCalledWith("Alice，欢迎你的加入", "success");

    vi.unstubAllGlobals();
  });

  it("注册成功但 user 缺昵称时用 username 显示欢迎 toast", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn(async (url: string) => {
      if (url === "/api/oauth/providers") {
        return mockApiResponse(["github"]);
      }
      if (url === "/api/auth/register") {
        return mockApiResponse({
          user: { id: 1, username: "user@example.com" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", mockFetch);

    useLoginModal.setState({ isOpen: true, view: "register" });
    render(<LoginModal />);

    await user.type(screen.getByPlaceholderText("邮箱地址"), "user@example.com");
    await user.type(screen.getByPlaceholderText("设置密码"), "password1");
    await user.type(screen.getByPlaceholderText("验证码"), "123456");
    await user.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith("user@example.com，欢迎你的加入", "success"),
    );

    vi.unstubAllGlobals();
  });
});

function mockApiResponse<T>(data: T) {
  return {
    json: () => Promise.resolve({ code: 0, message: "ok", data }),
  } as Response;
}
