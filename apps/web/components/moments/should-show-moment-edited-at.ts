import { formatRelativeTime } from "@/lib/format-time";

/** 编辑距今超过此窗口则不再展示（只提示近期编辑） */
const RECENT_EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** 发布与编辑间隔低于此阈值视为「时差不大」 */
const MIN_EDIT_GAP_MS = 24 * 60 * 60 * 1000;

/** 是否在碎语卡片展示「编辑于」：近期编辑、与发布时间有明显差异且相对文案不同 */
export function shouldShowMomentEditedAt(
  createdAt: string,
  updatedAt: string,
  now = Date.now(),
): boolean {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  if (updated - created <= 1000) return false;
  if (now - updated > RECENT_EDIT_WINDOW_MS) return false;
  if (updated - created < MIN_EDIT_GAP_MS) return false;

  // formatRelativeTime 依赖当前时间，测试时通过 fake timers 固定 now
  if (formatRelativeTime(new Date(createdAt)) === formatRelativeTime(new Date(updatedAt))) {
    return false;
  }

  return true;
}
