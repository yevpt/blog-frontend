import { useEffect } from "react";

import { type PresenceRecord, usePresenceStore } from "./presence-store";
import { subscribe } from "./presence-subscriptions";

export interface UsePresenceResult {
  /** undefined 表示尚无任何数据（既无 seed 也无轮询结果），UI 应占位。 */
  record: PresenceRecord | undefined;
}

/**
 * 订阅某个用户的在线感知数据，随全局批次轮询自动更新。
 * 通用 hook，不绑死 web；id 为 null/undefined 时不订阅。
 */
export function usePresence(
  id: number | null | undefined,
  seed?: PresenceRecord,
): UsePresenceResult {
  useEffect(() => {
    if (id == null) return;
    return subscribe([id]);
  }, [id]);

  useEffect(() => {
    if (id == null || !seed) return;
    usePresenceStore.getState().seed(id, seed);
  }, [id, seed]);

  const record = usePresenceStore((state) => (id == null ? undefined : state.records.get(id)));
  return { record };
}
