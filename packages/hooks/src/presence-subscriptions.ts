/** 订阅集硬上限；与后端 /users/presence 的 ids 截断上限保持一致。 */
const MAX_SUBSCRIBERS = 100;

/** 仅用 Map 维持插入序的 LRU 有序集合，value 无意义；无 refcount。 */
const subscribers = new Map<number, true>();
const listeners = new Set<(ids: number[]) => void>();

function emit() {
  const ids = getSubscribedIds();
  for (const listener of listeners) listener(ids);
}

function trim() {
  if (subscribers.size <= MAX_SUBSCRIBERS) return;
  const drop = subscribers.size - MAX_SUBSCRIBERS;
  let dropped = 0;
  for (const key of subscribers.keys()) {
    // Map 头部 = 最久未被(重新)订阅的 id，先淘汰它们。
    subscribers.delete(key);
    if (++dropped >= drop) break;
  }
}

/** 订阅一批 id；重复订阅会把已存在的 id 移到队尾（视为最新）。返回取消订阅函数。 */
export function subscribe(ids: number[]): () => void {
  for (const id of ids) {
    subscribers.delete(id);
    subscribers.set(id, true);
  }
  trim();
  emit();
  return () => {
    for (const id of ids) subscribers.delete(id);
    emit();
  };
}

/** 当前订阅的 id 列表，最旧到最新，最多 MAX_SUBSCRIBERS 个。 */
export function getSubscribedIds(): number[] {
  return [...subscribers.keys()];
}

/** 订阅集发生真实变化（subscribe / cleanup）时通知。返回取消监听函数。 */
export function onSubscriptionChange(cb: (ids: number[]) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
