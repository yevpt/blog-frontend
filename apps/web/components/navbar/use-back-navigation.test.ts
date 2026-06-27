import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
}));

// 读写 window.navigation 的精确类型（不污染全局 lib 类型）
type NavWindow = { navigation?: { canGoBack?: boolean } };

function setNavigation(value: { canGoBack: boolean } | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(window, "navigation");
    return;
  }
  (window as unknown as NavWindow).navigation = value;
}

async function loadHook() {
  // 每个用例需要全新模块（重置模块级 entryPath）
  const mod = await import("./use-back-navigation");
  return mod.useBackNavigation;
}

describe("useBackNavigation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPathname = "/";
    setNavigation(undefined);
  });

  afterEach(() => {
    setNavigation(undefined);
  });

  it("支持 Navigation API 且 canGoBack=true 时调用 router.back", async () => {
    setNavigation({ canGoBack: true });
    const useBackNavigation = await loadHook();

    const { result } = renderHook(() => useBackNavigation());
    result.current();

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("支持 Navigation API 且 canGoBack=false 时兜底 push('/')", async () => {
    setNavigation({ canGoBack: false });
    const useBackNavigation = await loadHook();

    const { result } = renderHook(() => useBackNavigation());
    result.current();

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("无 Navigation API 且停留在落地页时兜底 push('/')", async () => {
    mockPathname = "/guestbook";
    const useBackNavigation = await loadHook();

    const { result } = renderHook(() => useBackNavigation());
    result.current();

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("无 Navigation API 且已离开落地页时调用 router.back", async () => {
    mockPathname = "/";
    const useBackNavigation = await loadHook();

    const { result, rerender } = renderHook(() => useBackNavigation());
    // 模拟站内软导航：落地页捕获为 "/"，现跳到 /guestbook
    mockPathname = "/guestbook";
    rerender();
    result.current();

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("无 Navigation API 且导航后又回到落地页时兜底 push('/')", async () => {
    mockPathname = "/";
    const useBackNavigation = await loadHook();

    const { result, rerender } = renderHook(() => useBackNavigation());
    mockPathname = "/guestbook";
    rerender();
    mockPathname = "/"; // 退回落地页（地板）
    rerender();
    result.current();

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
