import { describe, it, expect, beforeEach } from "vitest";
import { useMomentModal } from "./use-moment-modal";

describe("useMomentModal", () => {
  beforeEach(() => {
    useMomentModal.setState({
      isOpen: false,
      publishCount: 0,
      lastPublishedUserId: null,
      lastPublishedMoment: null,
    });
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

  it("markPublished() 记录发布者、碎语响应并递增发布计数", () => {
    const moment = {
      id: 9,
      user_id: 7,
      content: "新碎语",
      status: 1 as const,
      comment_status: 1 as const,
      read_count: 0,
      is_top: false,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      images: [],
      created_at: "2026-05-30T09:00:00Z",
      updated_at: "2026-05-30T09:00:00Z",
    };
    useMomentModal.getState().markPublished(7, moment);

    expect(useMomentModal.getState().publishCount).toBe(1);
    expect(useMomentModal.getState().lastPublishedUserId).toBe(7);
    expect(useMomentModal.getState().lastPublishedMoment).toEqual(moment);
  });
});
