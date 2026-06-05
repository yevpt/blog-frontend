import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarActions } from "./navbar-actions";
import { useSession } from "@/app/providers/session-provider";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: null })),
}));

vi.mock("./navbar-user-menu", () => ({
  NavbarUserMenu: ({ userId }: { userId: number }) => <span data-testid="user-menu">{userId}</span>,
}));

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const mockSetTheme = vi.fn();
const mockOpenLoginModal = vi.fn();
let mockTheme: ThemeMode = "system";
let mockResolvedTheme: ResolvedTheme = "light";

vi.mock("../../app/providers/theme-provider", () => ({
  useTheme: () => ({
    theme: mockTheme,
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.login": "登录",
        "auth.register": "注册",
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

describe("NavbarActions", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockOpenLoginModal.mockClear();
    mockTheme = "system";
    mockResolvedTheme = "light";
    vi.mocked(useSession).mockReturnValue({ userId: null, profile: null });
  });

  it("渲染不崩溃，显示主题切换和登录入口", () => {
    render(<NavbarActions />);

    expect(
      screen.getByRole("button", { name: "当前生效主题：light，点击切换到 dark" }),
    ).toBeTruthy();
    expect(screen.getByText("登录")).toBeTruthy();
    expect(screen.queryByText("注册")).toBeNull();
  });

  it("当前生效主题为 light 时，点击切换到 dark", async () => {
    const user = userEvent.setup();
    mockTheme = "system";
    mockResolvedTheme = "light";

    render(<NavbarActions />);
    await user.click(screen.getByRole("button", { name: "当前生效主题：light，点击切换到 dark" }));

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("当前生效主题为 dark 时，点击切换到 light", async () => {
    const user = userEvent.setup();
    mockTheme = "system";
    mockResolvedTheme = "dark";

    render(<NavbarActions />);
    await user.click(screen.getByRole("button", { name: "当前生效主题：dark，点击切换到 light" }));

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("按钮图标展示当前生效主题，而不是 system 状态", () => {
    mockTheme = "system";
    mockResolvedTheme = "dark";

    render(<NavbarActions />);

    expect(screen.getByTestId("icon-moon")).toBeTruthy();
    expect(screen.queryByTestId("icon-monitor")).toBeNull();
  });

  it("点击登录按钮打开登录弹窗", async () => {
    const user = userEvent.setup();
    render(<NavbarActions />);
    await user.click(screen.getByText("登录"));
    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
  });

  it("已登录：显示 NavbarUserMenu，不显示登录按钮", () => {
    vi.mocked(useSession).mockReturnValue({ userId: 1, profile: null });
    render(<NavbarActions />);
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });

  it("未登录：显示登录按钮，不显示 UserMenu", () => {
    render(<NavbarActions />);
    expect(screen.getByText("登录")).toBeInTheDocument();
    expect(screen.queryByTestId("user-menu")).not.toBeInTheDocument();
  });
});
