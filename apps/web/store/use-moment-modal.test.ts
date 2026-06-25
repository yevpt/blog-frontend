import { describe, it, expect, beforeEach } from "vitest";
import { useMomentModal } from "./use-moment-modal";

describe("useMomentModal", () => {
  beforeEach(() => {
    useMomentModal.setState({ isOpen: false, publishCount: 0, lastPublishedUserId: null });
  });

  it("初始状态 isOpen 为 false", () => {
    expect(useMomentModal.getState().isOpen).toBe(false);
  });

  it("open() 将 isOpen 设为 true", () => {
    useMomentModal.getState().open();
    expect(useMomentModal.getState().isOpen).toBe(true);
  });

  it("close() 将 isOpen 设为 false", () => {
    useMomentModal.setState({ isOpen: true });
    useMomentModal.getState().close();
    expect(useMomentModal.getState().isOpen).toBe(false);
  });

  it("markPublished() 记录发布者并递增发布计数", () => {
    useMomentModal.getState().markPublished(7);

    expect(useMomentModal.getState().publishCount).toBe(1);
    expect(useMomentModal.getState().lastPublishedUserId).toBe(7);
  });
});
