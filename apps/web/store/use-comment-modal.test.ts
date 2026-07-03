import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommentModal } from "./use-comment-modal";

describe("useCommentModal", () => {
  beforeEach(() => {
    useCommentModal.setState({
      targetType: null,
      targetId: null,
      onCommentAdded: null,
      isVisible: false,
    });
  });

  it("初始状态无打开目标", () => {
    const state = useCommentModal.getState();
    expect(state.targetType).toBeNull();
    expect(state.targetId).toBeNull();
    expect(state.onCommentAdded).toBeNull();
  });

  it("open() 写入 targetType/targetId/onCommentAdded", () => {
    const onCommentAdded = vi.fn();
    useCommentModal.getState().open("article", 7, onCommentAdded);

    const state = useCommentModal.getState();
    expect(state.targetType).toBe("article");
    expect(state.targetId).toBe(7);
    expect(state.onCommentAdded).toBe(onCommentAdded);
  });

  it("open() 不传 onCommentAdded 时该字段为 null", () => {
    useCommentModal.getState().open("moment", 3);
    expect(useCommentModal.getState().onCommentAdded).toBeNull();
  });

  it("close() 清空所有字段", () => {
    useCommentModal.getState().open("article", 7, vi.fn());
    useCommentModal.getState().close();

    const state = useCommentModal.getState();
    expect(state.targetType).toBeNull();
    expect(state.targetId).toBeNull();
    expect(state.onCommentAdded).toBeNull();
  });

  it("初始状态 isVisible 为 false", () => {
    expect(useCommentModal.getState().isVisible).toBe(false);
  });

  it("open() 把 isVisible 置为 true", () => {
    useCommentModal.getState().open("article", 7);
    expect(useCommentModal.getState().isVisible).toBe(true);
  });

  it("close() 把 isVisible 置为 false", () => {
    useCommentModal.getState().open("article", 7);
    useCommentModal.getState().close();
    expect(useCommentModal.getState().isVisible).toBe(false);
  });

  it("hide() 只隐藏，保留 targetType/targetId", () => {
    useCommentModal.getState().open("article", 7);
    useCommentModal.getState().hide();

    const state = useCommentModal.getState();
    expect(state.isVisible).toBe(false);
    expect(state.targetType).toBe("article");
    expect(state.targetId).toBe(7);
  });

  it("show() 把 isVisible 置为 true，不改变 target", () => {
    useCommentModal.getState().open("article", 7);
    useCommentModal.getState().hide();
    useCommentModal.getState().show();

    const state = useCommentModal.getState();
    expect(state.isVisible).toBe(true);
    expect(state.targetType).toBe("article");
    expect(state.targetId).toBe(7);
  });
});
