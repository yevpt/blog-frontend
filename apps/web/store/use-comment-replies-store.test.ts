import { describe, it, expect, beforeEach } from "vitest";
import { useCommentRepliesStore } from "./use-comment-replies-store";

describe("useCommentRepliesStore", () => {
  beforeEach(() => {
    useCommentRepliesStore.setState({ openKeys: new Set() });
  });

  it("初始状态没有任何展开项", () => {
    expect(useCommentRepliesStore.getState().openKeys.size).toBe(0);
  });

  it("setOpen(true) 记录该 targetType+commentId 为展开", () => {
    useCommentRepliesStore.getState().setOpen("article", 1, true);
    expect(useCommentRepliesStore.getState().openKeys.has("article:1")).toBe(true);
  });

  it("setOpen(false) 移除该 targetType+commentId", () => {
    useCommentRepliesStore.getState().setOpen("article", 1, true);
    useCommentRepliesStore.getState().setOpen("article", 1, false);
    expect(useCommentRepliesStore.getState().openKeys.has("article:1")).toBe(false);
  });

  it("不同 targetType 相同 commentId 互不影响", () => {
    useCommentRepliesStore.getState().setOpen("article", 1, true);
    expect(useCommentRepliesStore.getState().openKeys.has("guestbook:1")).toBe(false);
  });

  it("状态未变化时不产生新的 openKeys 引用", () => {
    const before = useCommentRepliesStore.getState().openKeys;
    useCommentRepliesStore.getState().setOpen("article", 1, false);
    expect(useCommentRepliesStore.getState().openKeys).toBe(before);
  });
});
