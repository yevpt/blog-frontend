import { create } from "zustand";

/** 单个用户的在线感知片段；时间字段为 unix 秒。 */
export interface PresenceRecord {
  is_online: boolean;
  last_active_at?: number;
  last_login_at?: number;
}

interface PresenceState {
  records: Map<number, PresenceRecord>;
  /** 服务端初值幂等写入：该 id 已有记录时不覆盖（避免覆盖轮询拿到的新值）。 */
  seed: (id: number, record: PresenceRecord) => void;
  /** 轮询结果合并写入，覆盖优先级高于 seed。 */
  apply: (batch: Record<number, PresenceRecord>) => void;
  get: (id: number) => PresenceRecord | undefined;
}

/** 全局用户在线状态 store；非持久化，仅 client 侧使用。 */
export const usePresenceStore = create<PresenceState>((set, get) => ({
  records: new Map(),
  seed: (id, record) => {
    const { records } = get();
    if (records.has(id)) return;
    const next = new Map(records);
    next.set(id, record);
    set({ records: next });
  },
  apply: (batch) => {
    const { records } = get();
    const next = new Map(records);
    for (const [key, record] of Object.entries(batch)) {
      next.set(Number(key), record);
    }
    set({ records: next });
  },
  get: (id) => get().records.get(id),
}));
