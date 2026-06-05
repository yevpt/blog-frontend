import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Mock login modal store
vi.mock("../../store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false, view: "login" }),
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
        "nav.articles": "文章",
        "nav.snippets": "碎语",
        "nav.guestbook": "留言",
        "nav.friends": "友邻",
        "nav.circle": "圈子",
        "nav.about": "关于",
        "auth.login": "登录",
        "auth.register": "注册",
      };
      return translations[key] ?? key;
    },
  }),
}));

// 受控的 IntersectionObserver mock：捕获回调，由测试手动触发模拟“哨兵进/出视口”。
// jsdom 不实现 IntersectionObserver，必须 mock。
let ioCallback:
  | ((entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void)
  | null = null;
const ioObserve = vi.fn();
const ioDisconnect = vi.fn();

/** 模拟 IO 回调：isIntersecting=false 表示哨兵已离开视口（即页面已滚动）。 */
function fireIntersection(isIntersecting: boolean) {
  act(() => {
    ioCallback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ioCallback = null;

  class MockIntersectionObserver {
    constructor(
      cb: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
    ) {
      ioCallback = cb;
    }
    observe = ioObserve;
    disconnect = ioDisconnect;
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

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

  // 让 rAF 同步执行，使过渡开启逻辑在 render() 后立即完成，与生产行为一致
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(performance.now());
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SiteNavbar", () => {
  it("渲染不崩溃", () => {
    render(<SiteNavbar />);
    expect(document.querySelector("nav#navbar")).toBeTruthy();
  });

  it("IO 首次回调前导航不可见（opacity-0），回调后整体弹出（opacity-100）", () => {
    render(<SiteNavbar />);
    const navbar = document.querySelector("nav#navbar");
    // 未触发 IO 回调前：opacity-0 隐藏
    expect(navbar?.className).toContain("opacity-0");
    expect(navbar?.className).not.toContain("opacity-100");

    // 触发首次回调（哨兵在视口内 = 未滚动）
    fireIntersection(true);

    expect(navbar?.className).toContain("opacity-100");
    expect(navbar?.className).not.toContain("opacity-0");
  });

  it("桌面导航容器宽度与首页轮播容器齐平", () => {
    render(<SiteNavbar />);
    const navbarInner = document.querySelector("nav#navbar > div");

    expect(navbarInner?.className).toContain("max-w-[1120px]");
  });

  it("桌面导航链接为主页、碎语、留言、友邻、圈子", () => {
    render(<SiteNavbar />);
    expect(screen.getAllByText("主页").length).toBeGreaterThan(0);
    expect(screen.getAllByText("碎语").length).toBeGreaterThan(0);
    expect(screen.getAllByText("留言").length).toBeGreaterThan(0);
    expect(screen.getAllByText("友邻").length).toBeGreaterThan(0);
    expect(screen.getAllByText("圈子").length).toBeGreaterThan(0);
    expect(screen.queryByText("文章")).toBeNull();
    expect(screen.queryByText("关于")).toBeNull();
  });

  it("主题切换按钮存在（system 状态下展示当前生效主题图标）", () => {
    render(<SiteNavbar />);
    // theme 为 system 但 resolvedTheme 为 light，因此展示当前生效的 sun 图标。
    expect(screen.getAllByTestId("icon-sun").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("icon-monitor")).toBeNull();
  });

  it("移动端 hamburger 按钮存在", () => {
    render(<SiteNavbar />);
    expect(screen.getByLabelText("打开导航菜单")).toBeTruthy();
  });

  it("点击 hamburger 后在 nav 内部展开移动菜单", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    const menuBtn = screen.getByLabelText("打开导航菜单");
    await act(async () => {
      await user.click(menuBtn);
    });

    const navbar = document.querySelector("nav#navbar");
    const mobileMenu = screen.getByTestId("mobile-nav-menu");
    expect(navbar).toHaveAttribute("data-menu-open", "true");
    expect(navbar?.contains(mobileMenu)).toBe(true);
    expect(screen.getByTestId("mobile-nav-overlay")).toBeInTheDocument();
  });

  it("移动菜单展开时点击遮罩关闭菜单", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    await act(async () => {
      await user.click(screen.getByLabelText("打开导航菜单"));
    });
    await act(async () => {
      await user.click(screen.getByTestId("mobile-nav-overlay"));
    });

    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-menu-open", "false");
    expect(screen.queryByTestId("mobile-nav-overlay")).not.toBeInTheDocument();
  });

  it("再次点击 hamburger 后关闭移动菜单", async () => {
    const user = userEvent.setup();
    render(<SiteNavbar />);

    await act(async () => {
      await user.click(screen.getByLabelText("打开导航菜单"));
    });
    await act(async () => {
      await user.click(screen.getByLabelText("关闭导航菜单"));
    });

    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-menu-open", "false");
  });

  it("只保留登录按钮，不显示注册按钮", () => {
    render(<SiteNavbar />);
    expect(screen.getAllByText("登录").length).toBeGreaterThan(0);
    expect(screen.queryByText("注册")).toBeNull();
  });

  it("挂载即观察顶部哨兵元素（用于判定玻璃态）", () => {
    render(<SiteNavbar />);
    expect(ioObserve).toHaveBeenCalledTimes(1);
    const observed = ioObserve.mock.calls[0][0] as Element;
    expect(observed).toBeInstanceOf(HTMLElement);
  });

  it("刷新时滚动位置已还原：IO 首次回调直接以胶囊态弹出（不经过裸导航）", () => {
    render(<SiteNavbar />);
    const navbar = document.querySelector("nav#navbar");

    // IO 回调前：nav 不可见
    expect(navbar?.className).toContain("opacity-0");
    // 玻璃态此刻为 false（初始值），但用户不可见，无影响
    expect(navbar).toHaveAttribute("data-glass", "false");

    // 浏览器还原滚动后，IO 触发首次回调：哨兵已离开视口 → glass=true
    fireIntersection(false);

    // 弹出后：glass=true 且可见，用户看到的第一眼就是完整胶囊
    expect(navbar).toHaveAttribute("data-glass", "true");
    expect(navbar?.className).toContain("opacity-100");
  });

  it("滚动超过阈值后进入玻璃态，回到顶部（防抖 80ms 后）恢复非玻璃态", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    render(<SiteNavbar />);

    fireIntersection(false); // 初始化调用：哨兵离开视口 = 已滚动，立即生效
    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-glass", "true");

    fireIntersection(true); // 后续调用：哨兵进入视口，防抖 80ms
    // 防抖期内仍为玻璃态
    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-glass", "true");

    act(() => vi.advanceTimersByTime(80)); // 推进时钟，触发防抖回调
    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-glass", "false");

    vi.useRealTimers();
  });

  it("iOS 橡皮筋效果：哨兵快速进出时防抖被取消，玻璃态不闪烁", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    render(<SiteNavbar />);

    fireIntersection(false); // 初始化：已滚动，玻璃态 true
    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-glass", "true");

    fireIntersection(true); // 哨兵进入视口（橡皮筋弹出）→ 启动防抖
    act(() => vi.advanceTimersByTime(40)); // 40ms 内…
    fireIntersection(false); // 哨兵又离开（弹回）→ 取消防抖，立即恢复 true

    // 玻璃态仍为 true（防抖被取消）
    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-glass", "true");

    act(() => vi.advanceTimersByTime(100)); // 再等再久也不会变
    expect(document.querySelector("nav#navbar")).toHaveAttribute("data-glass", "true");

    vi.useRealTimers();
  });

  it("卸载时断开 IntersectionObserver", () => {
    const { unmount } = render(<SiteNavbar />);
    unmount();
    expect(ioDisconnect).toHaveBeenCalled();
  });
});
