import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { LocaleProvider } from "./locale-provider";
import { useLocale } from "@repo/hooks/locale";

// mock dynamic import，避免真实文件系统依赖
vi.mock("../../messages/zh.json", () => ({
  default: {
    nav: { home: "首页", snippets: "碎语", guestbook: "留言", friends: "友邻", circle: "圈子" },
    auth: { login: "登录", register: "注册" },
  },
}));

vi.mock("../../messages/en.json", () => ({
  default: {
    nav: {
      home: "Home",
      snippets: "Snippets",
      guestbook: "Guestbook",
      friends: "Friends",
      circle: "Circle",
    },
    auth: { login: "Login", register: "Register" },
  },
}));

// 辅助组件：展示当前 locale 和翻译结果
function LocaleDisplay() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="nav-home">{t("nav.home")}</span>
      <button onClick={() => setLocale("en")}>set en</button>
      <button onClick={() => setLocale("zh")}>set zh</button>
    </div>
  );
}

describe("LocaleProvider", () => {
  beforeEach(() => {
    // 每个测试前清理 localStorage，保证初始状态干净
    localStorage.clear();
  });

  it("渲染不崩溃，children 正常显示", () => {
    render(
      <LocaleProvider>
        <div data-testid="child">hello</div>
      </LocaleProvider>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("localStorage 无值时，默认 locale 为 zh", () => {
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("zh");
  });

  it("localStorage 已存储 en 时，初始 locale 为 en", () => {
    localStorage.setItem("locale", "en");
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("localStorage 已存储 zh 时，初始 locale 为 zh", () => {
    localStorage.setItem("locale", "zh");
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("zh");
  });

  it("setLocale('en') 后 locale 状态更新为 en", async () => {
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    await act(async () => {
      screen.getByText("set en").click();
    });

    expect(screen.getByTestId("locale").textContent).toBe("en");
  });

  it("setLocale('en') 后写入 localStorage", async () => {
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    await act(async () => {
      screen.getByText("set en").click();
    });

    expect(localStorage.getItem("locale")).toBe("en");
  });

  it("setLocale('zh') 后写入 localStorage", async () => {
    localStorage.setItem("locale", "en");
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    await act(async () => {
      screen.getByText("set zh").click();
    });

    expect(localStorage.getItem("locale")).toBe("zh");
  });

  it("messages 加载完成后 t('nav.home') 返回中文值", async () => {
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    // 等待 messages 异步加载完成
    await waitFor(() => {
      expect(screen.getByTestId("nav-home").textContent).toBe("首页");
    });
  });

  it("切换到 en 后 t('nav.home') 返回英文值", async () => {
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    await act(async () => {
      screen.getByText("set en").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("nav-home").textContent).toBe("Home");
    });
  });

  it("messages 未加载完成时 t() 降级返回 key 本身", () => {
    // 同步渲染后 messages 尚未加载完成，t() 应返回 key
    render(
      <LocaleProvider>
        <LocaleDisplay />
      </LocaleProvider>,
    );

    // 刚渲染、messages 为 null，应降级返回 key
    expect(screen.getByTestId("nav-home").textContent).toBe("nav.home");
  });
});
