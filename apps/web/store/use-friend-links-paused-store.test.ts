import { describe, it, expect, beforeEach } from "vitest";
import { useFriendLinksPausedStore } from "./use-friend-links-paused-store";

describe("useFriendLinksPausedStore", () => {
  beforeEach(() => {
    useFriendLinksPausedStore.setState({ open: false });
  });

  it("初始状态 open 为 false", () => {
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });

  it("setOpen(true) 展开", () => {
    useFriendLinksPausedStore.getState().setOpen(true);
    expect(useFriendLinksPausedStore.getState().open).toBe(true);
  });

  it("setOpen(false) 收起", () => {
    useFriendLinksPausedStore.getState().setOpen(true);
    useFriendLinksPausedStore.getState().setOpen(false);
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });

  it("reset() 把 open 置为 false", () => {
    useFriendLinksPausedStore.getState().setOpen(true);
    useFriendLinksPausedStore.getState().reset();
    expect(useFriendLinksPausedStore.getState().open).toBe(false);
  });
});
