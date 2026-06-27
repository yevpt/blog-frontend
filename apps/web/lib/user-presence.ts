import type { PresenceRecord } from "@repo/hooks";

import { formatRelativeTime } from "@/lib/format-time";

export interface PresenceInput {
  is_online?: boolean;
  last_active_at?: string | Date | null;
  last_login_at?: string | Date | null;
}

export type PresenceDisplay =
  | { kind: "online"; label: "在线" }
  | { kind: "offline"; label: string }
  | { kind: "never"; label: "从未活跃" };

function toUnixSec(value?: string | Date | null): number | undefined {
  if (value == null) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

/** 将 SSR/API 字段转为 usePresence 的 seed（unix 秒）。 */
export function toPresenceRecordSeed(input: PresenceInput): PresenceRecord | undefined {
  const last_active_at = toUnixSec(input.last_active_at);
  const last_login_at = toUnixSec(input.last_login_at);
  if (
    input.is_online === undefined &&
    last_active_at === undefined &&
    last_login_at === undefined
  ) {
    return undefined;
  }
  return {
    is_online: input.is_online ?? false,
    ...(last_active_at !== undefined ? { last_active_at } : {}),
    ...(last_login_at !== undefined ? { last_login_at } : {}),
  };
}

export function presenceRecordToInput(record: PresenceRecord): PresenceInput {
  return {
    is_online: record.is_online,
    last_active_at: record.last_active_at != null ? new Date(record.last_active_at * 1000) : null,
    last_login_at: record.last_login_at != null ? new Date(record.last_login_at * 1000) : null,
  };
}

/** usePresence 消费点：优先 store record，无则回落 props。 */
export function resolvePresenceFromSubscription(
  record: PresenceRecord | undefined,
  fallback: PresenceInput,
): PresenceInput {
  return record ? presenceRecordToInput(record) : fallback;
}

function pickActiveTime(input: PresenceInput): Date | null {
  if (input.last_active_at) return new Date(input.last_active_at);
  if (input.last_login_at) return new Date(input.last_login_at);
  return null;
}

/** 将 API 的 is_online / last_active_at 转为 UI 展示文案。 */
export function resolvePresenceDisplay(input: PresenceInput): PresenceDisplay {
  if (input.is_online) {
    return { kind: "online", label: "在线" };
  }
  const activeAt = pickActiveTime(input);
  if (activeAt) {
    return { kind: "offline", label: `${formatRelativeTime(activeAt)}活跃过` };
  }
  return { kind: "never", label: "从未活跃" };
}

export function isPresenceOnline(input: PresenceInput): boolean {
  return resolvePresenceDisplay(input).kind === "online";
}
