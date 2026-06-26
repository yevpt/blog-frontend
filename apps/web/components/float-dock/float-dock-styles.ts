import { cn } from "@repo/ui";

/** 竖向浮动操作栈：独立圆钮纵向排列 */
export const floatDockStackClass = "flex flex-col items-center gap-2";

/** 毛玻璃圆钮基底 */
export const floatDockOrbClass = cn(
  "relative flex size-10 shrink-0 items-center justify-center rounded-full p-0",
  "ring-1 ring-border/50 shadow-sm",
  "bg-background/65 text-muted-foreground backdrop-blur-xl",
  "transition-all duration-150",
  "hover:scale-[1.04] hover:bg-background/80 hover:text-foreground",
  "active:scale-95",
  "disabled:cursor-not-allowed",
  "dark:ring-border/40 dark:bg-background/55",
);

/** 已赞态：rose 实心底 */
export const floatDockOrbLikedClass = cn(
  "bg-rose-500/90 text-white ring-rose-400/50",
  "hover:bg-rose-600/90 hover:text-white",
);

/** Dock 内强调色图标 */
export const floatDockOrbAccentClass = "text-primary hover:text-primary";

/** 音乐钮图标强调色 */
export const floatDockOrbMusicClass = floatDockOrbAccentClass;

/** 低调主体色染色：叠在 floatDockOrbClass 上，保留 blur 与半透明质感 */
export const floatDockOrbPrimaryTintClass = cn(
  "ring-primary/25 bg-primary/12 text-primary",
  "hover:bg-primary/18 hover:text-primary",
  "dark:ring-primary/30 dark:bg-primary/18 dark:hover:bg-primary/24",
);

/** 点赞心形呼吸动画，仅已赞时启用 */
export const floatDockHeartbeatClass =
  "inline-flex transform-gpu animate-[heartbeat_3s_ease-in-out_infinite] will-change-transform";

/** Dock 内图标尺寸 */
export const floatDockIconSize = 16;

/** 单颗圆钮外径，用于水平定位 */
export const floatDockOrbSize = 40;

const FLOAT_SCROLL_TOP_MIN_PX = 800;
const FLOAT_SCROLL_TOP_VIEWPORT_RATIO = 1.5;

/** 滚动超过此距离后再显示回顶钮 */
export function getFloatScrollTopThreshold(viewportHeight: number): number {
  return Math.max(FLOAT_SCROLL_TOP_MIN_PX, viewportHeight * FLOAT_SCROLL_TOP_VIEWPORT_RATIO);
}

/** 回顶钮已显示后，需再向上滚过此距离才隐藏，避免阈值附近抖动 */
export const FLOAT_SCROLL_TOP_HIDE_HYSTERESIS = 120;

/** Dock 圆钮隐藏态：保留占位，避免栈内其它按钮位移 */
export const floatDockOrbHiddenClass = "pointer-events-none scale-90 opacity-0";
