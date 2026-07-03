import { describe, it, expect, beforeEach } from "vitest";
import { useModalCommentEditorStore } from "./use-modal-comment-editor-store";

describe("useModalCommentEditorStore", () => {
  beforeEach(() => {
    useModalCommentEditorStore.setState({ entries: {} });
  });

  it("初始状态没有任何 entry", () => {
    expect(useModalCommentEditorStore.getState().entries).toEqual({});
  });

  it("startReply 设置 replyTarget，清空 editTarget 和 content", () => {
    const target = { commentId: 1, toUsername: "Alice" };
    useModalCommentEditorStore.getState().startReply("article:1", target);
    expect(useModalCommentEditorStore.getState().entries["article:1"]).toEqual({
      replyTarget: target,
      editTarget: null,
      content: "",
    });
  });

  it("startEdit 设置 editTarget，用 initialContent 填充 content，清空 replyTarget", () => {
    const target = { type: "comment" as const, id: 1, initialContent: "原内容" };
    useModalCommentEditorStore.getState().startEdit("article:1", target);
    expect(useModalCommentEditorStore.getState().entries["article:1"]).toEqual({
      replyTarget: null,
      editTarget: target,
      content: "原内容",
    });
  });

  it("setContent 只更新已有 entry 的 content，不影响 replyTarget", () => {
    const target = { commentId: 1, toUsername: "Alice" };
    useModalCommentEditorStore.getState().startReply("article:1", target);
    useModalCommentEditorStore.getState().setContent("article:1", "写了一半");
    const entry = useModalCommentEditorStore.getState().entries["article:1"];
    expect(entry?.content).toBe("写了一半");
    expect(entry?.replyTarget).toEqual(target);
  });

  it("setContent 对不存在的 key 会创建新 entry（发表新评论场景）", () => {
    useModalCommentEditorStore.getState().setContent("article:1", "新评论内容");
    expect(useModalCommentEditorStore.getState().entries["article:1"]).toEqual({
      replyTarget: null,
      editTarget: null,
      content: "新评论内容",
    });
  });

  it("reset 删除该 key", () => {
    useModalCommentEditorStore
      .getState()
      .startReply("article:1", { commentId: 1, toUsername: "Alice" });
    useModalCommentEditorStore.getState().reset("article:1");
    expect(useModalCommentEditorStore.getState().entries["article:1"]).toBeUndefined();
  });

  it("discardAll 清空所有 key", () => {
    useModalCommentEditorStore.getState().setContent("article:1", "内容1");
    useModalCommentEditorStore.getState().setContent("moment:2", "内容2");
    useModalCommentEditorStore.getState().discardAll();
    expect(useModalCommentEditorStore.getState().entries).toEqual({});
  });

  it("不同 key 互不影响", () => {
    useModalCommentEditorStore.getState().setContent("article:1", "内容1");
    useModalCommentEditorStore.getState().setContent("moment:2", "内容2");
    useModalCommentEditorStore.getState().reset("article:1");
    expect(useModalCommentEditorStore.getState().entries["article:1"]).toBeUndefined();
    expect(useModalCommentEditorStore.getState().entries["moment:2"]?.content).toBe("内容2");
  });
});
