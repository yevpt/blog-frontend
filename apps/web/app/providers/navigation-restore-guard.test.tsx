import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import type { ReactElement } from "react";
import { useCommentModal } from "@/store/use-comment-modal";
import { useInlineEditorStore } from "@/store/use-inline-editor-store";
import { useFriendLinksPausedStore } from "@/store/use-friend-links-paused-store";
import { NavigationRestoreGuard, useNavigationRestoreSlot } from "./navigation-restore-guard";

const mockPathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

/** 模拟一次「前进导航」：改地址栏 + 改 mock 的 usePathname 返回值 + 重新渲染 */
function pushTo(rerender: (ui: ReactElement) => void, path: string) {
  window.history.pushState({}, "", path);
  mockPathname.value = path;
  act(() => {
    rerender(<NavigationRestoreGuard />);
  });
}

/** 模拟一次「后退/前进按钮」：改地址栏到目标路径 + 派发原生 popstate + 重新渲染让 usePathname 跟上 */
function popTo(rerender: (ui: ReactElement) => void, path: string) {
  window.history.pushState({}, "", path);
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  mockPathname.value = path;
  act(() => {
    rerender(<NavigationRestoreGuard />);
  });
}

describe("NavigationRestoreGuard", () => {
  beforeEach(() => {
    useCommentModal.setState({
      targetType: null,
      targetId: null,
      onCommentAdded: null,
      isVisible: false,
    });
    useInlineEditorStore.setState({ editors: {} });
    useFriendLinksPausedStore.setState({ open: false });
    useNavigationRestoreSlot.setState({ pathname: null });
    mockPathname.value = "/";
    window.history.pushState({}, "", "/");
  });

  it("前进导航时隐藏可见的评论弹窗", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");

    expect(useCommentModal.getState().isVisible).toBe(false);
    expect(useCommentModal.getState().targetType).toBe("article");
  });

  it("前进后精确后退回到原页面，恢复弹窗显示", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    expect(useCommentModal.getState().isVisible).toBe(false);

    popTo(rerender, "/");
    expect(useCommentModal.getState().isVisible).toBe(true);
    expect(useCommentModal.getState().targetType).toBe("article");
  });

  it("深度跳转（连续两次前进）后，原页面的弹窗状态作废", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    pushTo(rerender, "/moments");

    expect(useCommentModal.getState().targetType).toBeNull();
    expect(useCommentModal.getState().isVisible).toBe(false);
  });

  it("退回的不是原页面时，状态作废而不是恢复", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    popTo(rerender, "/some-other-page");

    expect(useCommentModal.getState().targetType).toBeNull();
  });

  it("深度跳转时同时清空草稿 store 和友邻展开 store", () => {
    useInlineEditorStore.getState().open("k1", "草稿");
    useFriendLinksPausedStore.getState().setOpen(true);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    pushTo(rerender, "/moments");

    expect(useInlineEditorStore.getState().editors).toEqual({});
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });

  it("点导航栏链接跳回原路径（前进导航，不是后退）不恢复弹窗", () => {
    useCommentModal.getState().open("article", 7);
    const { rerender } = render(<NavigationRestoreGuard />);

    pushTo(rerender, "/users/456");
    // 这里用 pushTo 而不是 popTo：模拟点击导航栏链接跳回「/」，不是浏览器后退按钮
    pushTo(rerender, "/");

    expect(useCommentModal.getState().targetType).toBeNull();
  });
});
