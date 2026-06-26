import { cn } from "@repo/ui";

/** 竖向浮动操作栈：独立圆钮纵向排列 */
export const floatDockStackClass = "flex flex-col items-center gap-2";

/** 毛玻璃圆钮基底 */
export const floatDockOrbClass = cn(
  "relative flex size-10 shrink-0 items-center justify-center rounded-full p-0",
  "ring-1 shadow-sm backdrop-blur-xl",
  "transition-all duration-150",
  "active:scale-95",
  "disabled:cursor-not-allowed",
  // 浅色：半透明 background
  "ring-border/50 bg-background/65 text-muted-foreground",
  "hover:scale-[1.04] hover:bg-background/80 hover:text-foreground",
  // 深色：抬升到 card 层 + glass 描边，避免与页面底色融为一体
  "dark:ring-[color:var(--glass-bdr)] dark:bg-card/80 dark:text-(--fg2)",
  "dark:shadow-[0_0_0_1px_var(--glass-ring),0_4px_20px_rgba(0,0,0,0.4)]",
  "dark:hover:bg-card/95 dark:hover:text-foreground",
);

/** 已赞态：rose 实心底 */
export const floatDockOrbLikedClass = cn(
  "bg-rose-500/90 text-white ring-rose-400/50",
  "hover:bg-rose-600/90 hover:text-white",
  "dark:bg-rose-500 dark:ring-rose-400/40 dark:hover:bg-rose-400",
);

/** Dock 内强调色图标 */
export const floatDockOrbAccentClass = "text-primary hover:text-primary";

/** 音乐钮图标强调色 */
export const floatDockOrbMusicClass = floatDockOrbAccentClass;

/** 低调主体色染色：叠在 floatDockOrbClass 上，保留 blur 与半透明质感 */
export const floatDockOrbPrimaryTintClass = cn(
  "ring-primary/25 bg-primary/12 text-primary",
  "hover:bg-primary/18 hover:text-primary",
  "dark:ring-primary/35 dark:bg-primary/22 dark:hover:bg-primary/30",
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

/** 向上滚动累计超过此距离后才显示回顶钮，过滤轻微误触/橡皮筋回弹 */
export const FLOAT_SCROLL_TOP_MIN_UPWARD_PX = 80;

/** Dock 圆钮隐藏态：保留占位，避免栈内其它按钮位移 */
export const floatDockOrbHiddenClass = "pointer-events-none scale-90 opacity-0";
