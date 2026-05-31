import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SiteNavbar } from "./site-navbar";

// Mock next/navigation
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => mockPathname(),
}));

// Mock next/link：渲染为普通 <a>
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock providers
vi.mock("../../app/providers/theme-provider", () => ({
  useTheme: () => ({
    theme: "system",
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}));

vi.mock("@repo/hooks/locale", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.home": "首页",
        "nav.snippets": "碎语",
        "nav.guestbook": "留言",
        "nav.friends": "友邻",
        "nav.circle": "圈子",
        "auth.login": "登录",
        "auth.register": "注册",
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock matchMedia（Navbar 中的 scroll 监听不涉及 matchMedia，但 ThemeProvider mock 覆盖了）
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.clearAllMocks();
});

describe("SiteNavbar", () => {
  it("渲染不崩溃", () => {
    render(<SiteNavbar />);
    // header 元素存在
    expect(document.querySelector("header")).toBeTruthy();
  });

  it("导航链接全部存在（首页、碎语、留言、友邻、圈子）", () => {
    render(<SiteNavbar />);
    // 导航链接在 md+ 和移动端抽屉各出现一次，用 getAllByText
    expect(screen.getAllByText("首页").length).toBeGreaterThan(0);
    expect(screen.getAllByText("碎语").length).toBeGreaterThan(0);
    expect(screen.getAllByText("留言").length).toBeGreaterThan(0);
    expect(screen.getAllByText("友邻").length).toBeGreaterThan(0);
    expect(screen.getAllByText("圈子").length).toBeGreaterThan(0);
  });

  it("主题切换按钮存在（monitor 图标）", () => {
    render(<SiteNavbar />);
    // theme 为 system，对应 monitor 图标
    expect(screen.getByTestId("icon-monitor")).toBeTruthy();
  });

  it("移动端 menu 按钮存在", () => {
    render(<SiteNavbar />);
    expect(screen.getByTestId("icon-menu")).toBeTruthy();
  });

  it("点击 menu 按钮后抽屉打开（close 按钮出现）", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    const menuBtn = screen.getByLabelText("打开导航菜单");
    await act(async () => {
      await user.click(menuBtn);
    });

    // 抽屉打开后 close 按钮可见
    expect(screen.getByLabelText("关闭导航菜单")).toBeTruthy();
    // 遮罩层存在
    expect(screen.getByLabelText("关闭导航菜单")).toBeTruthy();
  });

  it("点击 close 按钮后抽屉关闭（data-open 变为 false）", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    // 先打开
    await act(async () => {
      await user.click(screen.getByLabelText("打开导航菜单"));
    });

    // 确认抽屉已打开
    const drawer = screen.getByRole("generic", { name: "移动端导航抽屉" });
    expect(drawer).toHaveAttribute("data-open", "true");

    // 关闭
    await act(async () => {
      await user.click(screen.getByLabelText("关闭导航菜单"));
    });

    // 抽屉关闭后 data-open 变为 false（CSS 动画滑出，DOM 仍存在）
    expect(drawer).toHaveAttribute("data-open", "false");
    // 同时 aria-hidden 为 true
    expect(drawer).toHaveAttribute("aria-hidden", "true");
  });

  it("登录和注册按钮存在（md+ 可见）", () => {
    render(<SiteNavbar />);
    // 登录按钮在 md+ 区域和抽屉各一个
    expect(screen.getAllByText("登录").length).toBeGreaterThan(0);
    expect(screen.getAllByText("注册").length).toBeGreaterThan(0);
  });
});
