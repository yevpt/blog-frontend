// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CSSProperties, ReactNode, Ref } from "react";
import { CommentModal } from "./comment-modal";

const gestureState = vi.hoisted(() => ({
  sheetStyle: {},
  isDragging: false,
  isExpanded: false,
  expandOffset: 0,
}));

const desktopState = vi.hoisted(() => ({
  isDesktop: false,
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Modal: ({
    isOpen,
    children,
    onOpenChange,
    modalClassName,
    modalStyle,
    modalRef,
    "aria-label": ariaLabel,
  }: {
    isOpen?: boolean;
    children: ReactNode | ((opts: { close: () => void }) => ReactNode);
    onOpenChange?: (open: boolean) => void;
    modalClassName?: string;
    modalStyle?: CSSProperties;
    modalRef?: Ref<HTMLDivElement>;
    "aria-label"?: string;
  }) =>
    isOpen ? (
      <>
        <button
          type="button"
          aria-label="关闭遮罩"
          data-testid="modal-overlay"
          onClick={() => onOpenChange?.(false)}
        />
        <div data-testid="modal-positioner">
          <section
            ref={modalRef}
            role="dialog"
            aria-label={ariaLabel}
            style={modalStyle}
            className={modalClassName}
          >
            {typeof children === "function"
              ? children({ close: () => onOpenChange?.(false) })
              : children}
          </section>
        </div>
      </>
    ) : null,
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

vi.mock("./modal-comments", () => ({
  ModalComments: ({ targetType, targetId }: { targetType: string; targetId: number }) => (
    <div data-testid="comment-section" data-target-type={targetType} data-target-id={targetId} />
  ),
}));

vi.mock("@/hooks/use-sheet-gesture", () => ({
  useSheetGesture: () => gestureState,
}));

function mockMatchMedia(isDesktop: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches:
      query === "(prefers-reduced-motion: reduce)"
        ? false
        : query === "(min-width: 768px)" && isDesktop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("CommentModal", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    gestureState.sheetStyle = {};
    gestureState.isDragging = false;
    gestureState.isExpanded = false;
    gestureState.expandOffset = 0;
    desktopState.isDesktop = false;
    mockMatchMedia(desktopState.isDesktop);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("移动端：挂载后渲染 dialog 和「评论」标题", () => {
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("评论")).toBeTruthy();
  });

  it("移动端：header 只显示「评论」文字", () => {
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.textContent).toBe("评论");
  });

  it("移动端：点击遮罩触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommentModal targetType="article" targetId={1} onClose={onClose} />);
    await user.click(screen.getByTestId("modal-overlay"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("点击关闭按钮触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommentModal targetType="article" targetId={1} onClose={onClose} />);
    await user.click(screen.getByLabelText("关闭评论"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("渲染 ModalComments 并传入正确 targetType/targetId", () => {
    render(<CommentModal targetType="moment" targetId={7} onClose={vi.fn()} />);
    const section = screen.getByTestId("comment-section");
    expect(section.dataset.targetType).toBe("moment");
    expect(section.dataset.targetId).toBe("7");
  });

  it("移动端：expanded 状态使用全屏高度", async () => {
    gestureState.isExpanded = true;
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog.style.height).toBe("100dvh"));
    expect(dialog.style.maxHeight).toBe("100dvh");
  });

  it("移动端：拖动中使用动态高度跟手", async () => {
    gestureState.isDragging = true;
    gestureState.expandOffset = 80;
    gestureState.sheetStyle = { transform: "translateY(0px)" };
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog.style.height).toBe("calc(70dvh + 80px)"));
  });

  it("桌面端：渲染居中弹窗而非底部弹出", () => {
    desktopState.isDesktop = true;
    mockMatchMedia(true);
    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-w-[520px]");
    expect(dialog.className).toContain("rounded-[20px]");
    // 桌面端无拖动把手
    expect(
      screen.queryByText("评论")?.closest("section")?.querySelector(".cursor-grab"),
    ).toBeNull();
  });

  it("桌面端：点击遮罩触发 onClose", async () => {
    desktopState.isDesktop = true;
    mockMatchMedia(true);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommentModal targetType="article" targetId={1} onClose={onClose} />);
    await user.click(screen.getByTestId("modal-overlay"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("桌面端：内容加载后应用高度过渡样式", async () => {
    desktopState.isDesktop = true;
    mockMatchMedia(true);
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 520,
      height: 320,
      top: 0,
      left: 0,
      right: 520,
      bottom: 320,
      toJSON: () => ({}),
    });

    render(<CommentModal targetType="article" targetId={1} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");

    await waitFor(() => expect(dialog.style.height).toBe("320px"));
    await waitFor(() => expect(dialog.style.transition).toContain("height"), { timeout: 300 });

    rectSpy.mockRestore();
  });
});
