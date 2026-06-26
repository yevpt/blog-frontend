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
