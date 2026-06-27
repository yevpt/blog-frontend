import { hashAvatarSeed } from "./avatar-hash";
import { encodeMockPortraitDataUrl, isMockPortraitDataUrl } from "@/lib/mock-portrait";

/** 系统预设头像数量，与 public/avatars/presets 下文件一一对应（遗留资源，新逻辑不再使用） */
export const PRESET_AVATAR_COUNT = 12;

const PRESET_AVATAR_BASE = "/avatars/presets";

export { hashAvatarSeed };

const INITIALS_TONES = [
  "bg-primary/12 text-primary",
  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  "bg-amber-500/12 text-amber-600 dark:text-amber-500",
  "bg-rose-500/12 text-rose-600 dark:text-rose-400",
] as const;

/** @deprecated 新逻辑改用 resolveFallbackAvatarUrl；保留供测试与渐进迁移 */
export function resolvePresetAvatarUrl(seed: string | number): string {
  const index = (hashAvatarSeed(seed) % PRESET_AVATAR_COUNT) + 1;
  return `${PRESET_AVATAR_BASE}/${String(index).padStart(2, "0")}.svg`;
}

/** 无头像用户的程序化 mock 肖像（按 userId 确定性生成） */
export function resolveInactiveMockAvatarUrl(seed: string | number): string {
  return encodeMockPortraitDataUrl(seed);
}

/** 无头像且有 userId 时的回退路径 */
export function resolveFallbackAvatarUrl(seed: string | number): string {
  return resolveInactiveMockAvatarUrl(seed);
}

/** 首字母占位背景色，按 seed 固定映射 */
export function resolveInitialsTone(seed: string | number): string {
  return INITIALS_TONES[hashAvatarSeed(seed) % INITIALS_TONES.length];
}

export function isPresetAvatarUrl(url: string | undefined): boolean {
  return !!url?.startsWith(`${PRESET_AVATAR_BASE}/`);
}

export function isInactiveMockAvatarUrl(url: string | undefined): boolean {
  return isMockPortraitDataUrl(url);
}

/** 站内静态回退头像（预设 / 长期未活跃 mock），加载策略与远程图区分 */
export function isLocalFallbackAvatarUrl(url: string | undefined): boolean {
  return isPresetAvatarUrl(url) || isInactiveMockAvatarUrl(url);
}
