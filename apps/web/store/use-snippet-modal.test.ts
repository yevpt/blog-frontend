import { describe, it, expect, beforeEach } from "vitest";
import { useSnippetModal } from "./use-snippet-modal";

describe("useSnippetModal", () => {
  beforeEach(() => {
    useSnippetModal.setState({ isOpen: false, publishCount: 0, lastPublishedUserId: null });
  });

  it("初始状态 isOpen 为 false", () => {
    expect(useSnippetModal.getState().isOpen).toBe(false);
  });

  it("open() 将 isOpen 设为 true", () => {
    useSnippetModal.getState().open();
    expect(useSnippetModal.getState().isOpen).toBe(true);
  });

  it("close() 将 isOpen 设为 false", () => {
    useSnippetModal.setState({ isOpen: true });
    useSnippetModal.getState().close();
    expect(useSnippetModal.getState().isOpen).toBe(false);
  });

  it("markPublished() 记录发布者并递增发布计数", () => {
    useSnippetModal.getState().markPublished(7);

    expect(useSnippetModal.getState().publishCount).toBe(1);
    expect(useSnippetModal.getState().lastPublishedUserId).toBe(7);
  });
});
