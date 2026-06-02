import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SiteNavbar } from "./site-navbar";

const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => mockPathname(),
}));

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

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

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
      };
      return translations[key] ?? key;
    },
  }),
}));

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
    expect(document.querySelector("nav#navbar")).toBeTruthy();
  });

  it("导航链接全部存在（碎语、留言、友邻、圈子）", () => {
    render(<SiteNavbar />);
    expect(screen.getAllByText("碎语").length).toBeGreaterThan(0);
    expect(screen.getAllByText("留言").length).toBeGreaterThan(0);
    expect(screen.getAllByText("友邻").length).toBeGreaterThan(0);
    expect(screen.getAllByText("圈子").length).toBeGreaterThan(0);
  });

  it("主题切换按钮存在（light 状态下展示 sun 图标）", () => {
    render(<SiteNavbar />);
    expect(screen.getAllByTestId("icon-sun").length).toBeGreaterThan(0);
  });

  it("移动端 menu 按钮存在", () => {
    render(<SiteNavbar />);
    expect(screen.getByTestId("icon-menu")).toBeTruthy();
  });

  it("点击 menu 按钮后菜单打开（展示 close 图标）", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    const menuBtn = screen.getByLabelText("打开导航菜单");
    await act(async () => {
      await user.click(menuBtn);
    });

    expect(screen.getByTestId("icon-close")).toBeTruthy();
    expect(screen.getByLabelText("关闭导航菜单")).toBeTruthy();
  });

  it("点击 close 按钮后菜单关闭（menu 图标重新出现）", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    await act(async () => {
      await user.click(screen.getByLabelText("打开导航菜单"));
    });

    await act(async () => {
      await user.click(screen.getByLabelText("关闭导航菜单"));
    });

    expect(screen.getByTestId("icon-menu")).toBeTruthy();
  });

  it("登录按钮存在", () => {
    render(<SiteNavbar />);
    expect(screen.getAllByText("登录").length).toBeGreaterThan(0);
  });
});
