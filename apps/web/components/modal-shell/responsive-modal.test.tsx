import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResponsiveModalShell } from "./responsive-modal";

const gestureState = vi.hoisted(() => ({
  sheetStyle: { transform: "translateY(0px)" } as const,
  isDragging: false,
  isExpanded: false,
  expandOffset: 0,
  expand: vi.fn(),
}));

function mockMatch(isDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("min-width: 768px") ? isDesktop : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

vi.mock("@/hooks/use-sheet-gesture", () => ({
  useSheetGesture: () => gestureState,
}));

vi.mock("@/hooks/use-visual-viewport-inset", () => ({
  useVisualViewportInset: () => ({ bottomInset: 0, viewportHeight: 800 }),
}));

vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});

beforeEach(() => {
  mockMatch(true);
  gestureState.sheetStyle = { transform: "translateY(0px)" };
  gestureState.isDragging = false;
  gestureState.isExpanded = false;
  gestureState.expandOffset = 0;
  gestureState.expand.mockClear();
});

describe("ResponsiveModalShell", () => {
  it("渲染标题、body 与 footer", async () => {
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}} footer={<span>底栏</span>}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    expect(screen.getByText("正文")).toBeInTheDocument();
    expect(screen.getByText("底栏")).toBeInTheDocument();
  });

  it("移动端视口渲染底部 sheet（含拖拽抓手）", async () => {
    mockMatch(false);
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".cursor-grab")).toBeTruthy());
  });

  it("isOpen 从关到开时按当前视口判定（不在挂载时锁死）", async () => {
    const props = { title: "写碎语", onClose: () => {} };
    const { rerender } = render(
      <ResponsiveModalShell isOpen={false} {...props}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    mockMatch(false);
    rerender(
      <ResponsiveModalShell isOpen {...props}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    expect(await screen.findByRole("dialog", { name: "写碎语" })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".cursor-grab")).toBeTruthy());
  });

  it("打开期间视口由桌面变为移动时实时切换为 sheet", async () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;
    let matches = true;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      get matches() {
        return q.includes("min-width: 768px") ? matches : false;
      },
      media: q,
      addEventListener: (_: string, h: (e: MediaQueryListEvent) => void) => {
        changeHandler = h;
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    await screen.findByRole("dialog", { name: "写碎语" });
    expect(document.querySelector(".cursor-grab")).toBeNull();

    matches = false;
    await act(async () => {
      changeHandler?.({ matches: false } as MediaQueryListEvent);
    });
    await waitFor(() => expect(document.querySelector(".cursor-grab")).toBeTruthy());
  });

  it("点击关闭键触发 onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={onClose}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );
    await user.click(await screen.findByRole("button", { name: "关闭" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("移动端内容溢出折叠高度时，调用 onContentResize 会自动展开为全屏", async () => {
    mockMatch(false);
    let onContentResize: (() => void) | undefined;

    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {(args) => {
          onContentResize = args.onContentResize;
          return <p>正文</p>;
        }}
      </ResponsiveModalShell>,
    );

    const panel = await screen.findByTestId("modal-panel");
    // jsdom 不反映 inline height: 70dvh，用折叠态圆角与 maxHeight 代替
    expect(panel.className).toContain("rounded-t-[20px]");
    await waitFor(() => expect(panel.style.maxHeight).toBe("100dvh"));

    const scrollNode = screen.getByText("正文").parentElement as HTMLElement;
    Object.defineProperty(scrollNode, "scrollHeight", { value: 800, configurable: true });
    Object.defineProperty(scrollNode, "clientHeight", { value: 400, configurable: true });

    expect(onContentResize).toBeDefined();
    act(() => onContentResize?.());

    expect(gestureState.expand).toHaveBeenCalledOnce();
  });

  it("移动端内容未溢出时保持折叠高度，不主动展开", async () => {
    mockMatch(false);
    let onContentResize: (() => void) | undefined;

    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {(args) => {
          onContentResize = args.onContentResize;
          return <p>正文</p>;
        }}
      </ResponsiveModalShell>,
    );

    const panel = await screen.findByTestId("modal-panel");
    expect(panel.className).toContain("rounded-t-[20px]");
    await waitFor(() => expect(panel.style.maxHeight).toBe("100dvh"));

    const scrollNode = screen.getByText("正文").parentElement as HTMLElement;
    Object.defineProperty(scrollNode, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(scrollNode, "clientHeight", { value: 400, configurable: true });

    act(() => onContentResize?.());

    expect(gestureState.expand).not.toHaveBeenCalled();
    expect(panel.className).toContain("rounded-t-[20px]");
  });

  it("移动端不监听 scrollRef 自身尺寸变化（避免与手动收起手势打架）", async () => {
    mockMatch(false);
    const observe = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor() {}
        observe = observe;
        disconnect = vi.fn();
      },
    );

    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {() => <p>正文</p>}
      </ResponsiveModalShell>,
    );

    await screen.findByTestId("modal-panel");
    expect(observe).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("桌面内容尺寸变化时自动重测面板高度", async () => {
    if (window.visualViewport) {
      Object.defineProperty(window.visualViewport, "height", {
        configurable: true,
        value: 1000,
      });
    }
    let resizeCallback: (() => void) | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resizeCallback = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    render(
      <ResponsiveModalShell isOpen title="写碎语" onClose={() => {}}>
        {() => <div>会变高的内容</div>}
      </ResponsiveModalShell>,
    );

    await screen.findByTestId("modal-panel");
    expect(resizeCallback).toBeDefined();
    expect(observe).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
