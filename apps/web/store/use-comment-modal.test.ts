import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommentModal } from "./use-comment-modal";

describe("useCommentModal", () => {
  beforeEach(() => {
    useCommentModal.setState({ targetType: null, targetId: null, onCommentAdded: null });
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
});
