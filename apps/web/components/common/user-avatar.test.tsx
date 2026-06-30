import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  UserAvatar,
  resetLoadedAvatarSrcCacheForTests,
  AVATAR_LOAD_TIMEOUT_MS,
  AVATAR_MAX_RETRIES,
  AVATAR_RETRY_DELAY_MS,
} from "./user-avatar";
import { resolveInactiveMockAvatarUrl } from "@/lib/preset-avatar";

const deferredMediaMock = vi.hoisted(() => ({
  useDeferredMediaActivation: vi.fn(() => true),
}));

vi.mock("@repo/hooks", () => ({
  shouldDeferRemoteMediaSrc: (src: string | undefined) => {
    if (!src) return false;
    return !src.startsWith("data:") && !src.startsWith("blob:");
  },
  useDeferredMediaActivation: deferredMediaMock.useDeferredMediaActivation,
}));

const { useDeferredMediaActivation } = deferredMediaMock;

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const imageMockState = vi.hoisted(() => ({
  completeOnMount: false,
}));

describe("UserAvatar", () => {
  let completeSpy: ReturnType<typeof vi.spyOn> | undefined;
  let naturalWidthSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    imageMockState.completeOnMount = false;
    resetLoadedAvatarSrcCacheForTests();
    vi.mocked(useDeferredMediaActivation).mockReturnValue(true);

    completeSpy?.mockRestore();
    naturalWidthSpy?.mockRestore();

    if (imageMockState.completeOnMount) {
      completeSpy = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
      naturalWidthSpy = vi
        .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
        .mockReturnValue(48);
    }
  });

  afterEach(() => {
    completeSpy?.mockRestore();
    naturalWidthSpy?.mockRestore();
    vi.useRealTimers();
  });

  it("媒体未激活时远程头像仅显示骨架", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    expect(screen.getByTestId("user-avatar-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Alice" })).not.toBeInTheDocument();
  });

  it("loadingEager 不跳过 defer，媒体未激活时不挂载 img", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" loadingEager />);
    expect(screen.getByTestId("user-avatar-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Alice" })).not.toBeInTheDocument();
  });

  it("loadingEager 在 defer 就绪后 loading 为 eager", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" loadingEager />);
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute("loading", "eager");
  });

  it("有 src 时渲染 img 元素", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("头像图为原生 img 直连 OSS", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" }).tagName).toBe("IMG");
  });

  it("src 后缀为 .php 时回退到自托管 mock 头像", () => {
    render(
      <UserAvatar src="https://blog-oss.yevpt.com/avatar/a.php?a=1&b=2" userId={7} name="Alice" />,
    );
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute(
      "src",
      resolveInactiveMockAvatarUrl(7),
    );
  });

  it("无头像且有 userId 时展示自托管 mock 肖像", () => {
    render(<UserAvatar userId={42} name="bob" />);
    expect(screen.getByRole("img", { name: "bob" })).toHaveAttribute(
      "src",
      resolveInactiveMockAvatarUrl(42),
    );
  });

  it("src 后缀为 .asp 且无 userId 时回退到首字母", () => {
    render(<UserAvatar src="https://blog-oss.yevpt.com/avatar/a.asp?a=1&b=2" name="Alice" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("src 无扩展名时放行，正常渲染 img", () => {
    render(<UserAvatar src="https://blog-oss.yevpt.com/avatar/user/abc123" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toBeInTheDocument();
  });

  it("data: URL 不受扩展名校验影响，正常渲染 img", () => {
    render(<UserAvatar src="data:image/png;base64,xx" name="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toBeInTheDocument();
  });

  it("priority 模式下跳过骨架延迟，直接加载且 loading 为 eager", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" priority />);
    expect(screen.getByTestId("user-avatar-skeleton")).toHaveClass("opacity-0");
    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("有 src 时加载前显示首字母占位，加载完成后图片淡入", () => {
    render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);

    expect(screen.getByTestId("user-avatar-placeholder")).toHaveTextContent("A");
    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-0");

    fireEvent.load(screen.getByRole("img", { name: "Alice" }));

    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-100");
    expect(screen.getByTestId("user-avatar-placeholder")).toHaveClass("opacity-0");
  });

  it("src 变化后重新显示加载占位", () => {
    const { rerender } = render(<UserAvatar src="https://example.com/a.jpg" name="Alice" />);

    fireEvent.load(screen.getByRole("img", { name: "Alice" }));
    rerender(<UserAvatar src="https://example.com/b.jpg" name="Alice" />);

    expect(screen.getByTestId("user-avatar-placeholder")).toHaveClass("opacity-100");
    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-0");
  });

  it("图片已从缓存完成加载时无需等待 load 事件", () => {
    completeSpy = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    naturalWidthSpy = vi
      .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
      .mockReturnValue(48);

    render(<UserAvatar src="https://example.com/cached.jpg" name="Alice" />);

    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-100");
    expect(screen.getByTestId("user-avatar-placeholder")).toHaveClass("opacity-0");
  });

  it("同一 src remount 且图片未缓存完成时以 eager 挂载并在 load 后恢复", async () => {
    const { unmount } = render(<UserAvatar src="https://example.com/sticky.jpg" name="Alice" />);

    fireEvent.load(screen.getByRole("img", { name: "Alice" }));
    expect(screen.getByRole("img", { name: "Alice" })).toHaveClass("opacity-100");

    imageMockState.completeOnMount = false;
    unmount();
    render(<UserAvatar src="https://example.com/sticky.jpg" name="Alice" />);

    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveClass("opacity-100");

    fireEvent.load(img);
    expect(img).toHaveClass("opacity-100");
  });

  it("同一 src 已被其他头像加载过时以 eager 挂载", () => {
    render(<UserAvatar src="https://example.com/shared.jpg" name="A" />);
    fireEvent.load(screen.getByRole("img", { name: "A" }));

    render(<UserAvatar src="https://example.com/shared.jpg" name="B" />);
    expect(screen.getByRole("img", { name: "B" })).toHaveAttribute("loading", "eager");
  });

  it("defer 激活后父级重渲染不卸载 img", () => {
    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    const { rerender } = render(<UserAvatar src="https://example.com/latch.jpg" name="Alice" />);
    expect(screen.queryByRole("img", { name: "Alice" })).not.toBeInTheDocument();

    vi.mocked(useDeferredMediaActivation).mockReturnValue(true);
    rerender(<UserAvatar src="https://example.com/latch.jpg" name="Alice" className="step-2" />);
    const img = screen.getByRole("img", { name: "Alice" });
    fireEvent.load(img);

    vi.mocked(useDeferredMediaActivation).mockReturnValue(false);
    rerender(<UserAvatar src="https://example.com/latch.jpg" name="Alice" className="ring-1" />);
    expect(screen.getByRole("img", { name: "Alice" })).toBe(img);
  });

  it("同一 userId 的 mock 头像保持稳定", () => {
    const first = render(<UserAvatar userId={99} name="A" />);
    const firstSrc = screen.getByRole("img").getAttribute("src");
    first.unmount();
    render(<UserAvatar userId={99} name="B" />);
    expect(screen.getByRole("img").getAttribute("src")).toBe(firstSrc);
  });

  it("无 src 且无 userId 时渲染首字母大写", () => {
    render(<UserAvatar name="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("加载超时后间隔重试", async () => {
    vi.useFakeTimers();
    render(
      <UserAvatar src="https://example.com/slow.jpg" name="Alice" loadingEager defer={false} />,
    );

    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute("data-retry-attempt", "0");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AVATAR_LOAD_TIMEOUT_MS);
      await vi.advanceTimersByTimeAsync(AVATAR_RETRY_DELAY_MS);
    });

    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute("data-retry-attempt", "1");
  });

  it("加载失败后重试成功则正常展示", async () => {
    vi.useFakeTimers();
    render(
      <UserAvatar src="https://example.com/flaky.jpg" name="Alice" loadingEager defer={false} />,
    );

    await act(async () => {
      fireEvent.error(screen.getByRole("img", { name: "Alice" }));
      await vi.advanceTimersByTimeAsync(AVATAR_RETRY_DELAY_MS);
    });

    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toHaveAttribute("data-retry-attempt", "1");
    fireEvent.load(img);

    expect(img).toHaveClass("opacity-100");
  });

  it("img 多次失败耗尽重试后有 userId 时回退到 mock 头像", async () => {
    vi.useFakeTimers();
    render(
      <UserAvatar
        src="https://broken.url/img.jpg"
        userId={5}
        name="Charlie"
        loadingEager
        defer={false}
      />,
    );

    for (let attempt = 0; attempt <= AVATAR_MAX_RETRIES; attempt += 1) {
      await act(async () => {
        fireEvent.error(screen.getByRole("img", { name: "Charlie" }));
        if (attempt < AVATAR_MAX_RETRIES) {
          await vi.advanceTimersByTimeAsync(AVATAR_RETRY_DELAY_MS);
        }
      });
    }

    expect(screen.getByRole("img", { name: "Charlie" })).toHaveAttribute(
      "src",
      resolveInactiveMockAvatarUrl(5),
    );
  });

  it("name 为空字符串时显示 ?", () => {
    render(<UserAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("size=xs 应用 h-5 w-5", () => {
    const { container } = render(<UserAvatar name="D" size="xs" />);
    expect(container.firstChild).toHaveClass("h-5");
    expect(container.firstChild).toHaveClass("w-5");
  });

  it("size=md 应用 h-7 w-7（默认）", () => {
    const { container } = render(<UserAvatar name="D" />);
    expect(container.firstChild).toHaveClass("h-7");
    expect(container.firstChild).toHaveClass("w-7");
  });

  it("size=ml 应用 30px", () => {
    const { container } = render(<UserAvatar name="D" size="ml" />);
    expect(container.firstChild).toHaveClass("h-[30px]");
    expect(container.firstChild).toHaveClass("w-[30px]");
  });
});
