import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationStore } from "./use-notification-store";

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.getState().reset();
  });

  it("默认未读数为 0", () => {
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().hasLoaded).toBe(false);
  });

  it("setUnreadCount 会规整负数并写入未读数", () => {
    useNotificationStore.getState().setUnreadCount(8);
    expect(useNotificationStore.getState().unreadCount).toBe(8);
    expect(useNotificationStore.getState().hasLoaded).toBe(true);

    useNotificationStore.getState().setUnreadCount(-3);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("bumpListSync 递增 listSyncVersion，reset 归零", () => {
    useNotificationStore.getState().bumpListSync();
    expect(useNotificationStore.getState().listSyncVersion).toBe(1);
    useNotificationStore.getState().reset();
    expect(useNotificationStore.getState().listSyncVersion).toBe(0);
  });
});
