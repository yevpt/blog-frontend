import { beforeEach, describe, expect, it } from "vitest";

import { usePresenceStore } from "./presence-store";

beforeEach(() => {
  usePresenceStore.setState({ records: new Map() });
});

describe("usePresenceStore", () => {
  it("seed 在记录不存在时写入", () => {
    usePresenceStore.getState().seed(1, { is_online: true });
    expect(usePresenceStore.getState().get(1)).toEqual({ is_online: true });
  });

  it("seed 已存在的 id 不覆盖", () => {
    usePresenceStore.getState().seed(1, { is_online: false, last_active_at: 100 });
    usePresenceStore.getState().seed(1, { is_online: true });
    expect(usePresenceStore.getState().get(1)).toEqual({ is_online: false, last_active_at: 100 });
  });

  it("apply 优先于已有的 seed 值", () => {
    usePresenceStore.getState().seed(1, { is_online: false });
    usePresenceStore.getState().apply({ 1: { is_online: true, last_active_at: 200 } });
    expect(usePresenceStore.getState().get(1)).toEqual({ is_online: true, last_active_at: 200 });
  });

  it("apply 合并多个 id,未触及的 id 保留原值", () => {
    usePresenceStore.getState().seed(1, { is_online: true });
    usePresenceStore.getState().apply({ 2: { is_online: false } });
    expect(usePresenceStore.getState().get(1)).toEqual({ is_online: true });
    expect(usePresenceStore.getState().get(2)).toEqual({ is_online: false });
  });

  it("apply 后 records 是新的 Map 实例,以触发订阅更新", () => {
    const before = usePresenceStore.getState().records;
    usePresenceStore.getState().apply({ 1: { is_online: true } });
    expect(usePresenceStore.getState().records).not.toBe(before);
  });

  it("get 对不存在的 id 返回 undefined", () => {
    expect(usePresenceStore.getState().get(999)).toBeUndefined();
  });
});
