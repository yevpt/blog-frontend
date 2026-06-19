import type { ReactNode } from "react";

/** `FadeInUp` 的 props。 */
export interface FadeInUpProps {
  children: ReactNode;
  /** 动画延迟（毫秒），默认 0 */
  delay?: number;
  /** 动画时长（毫秒），默认 400 */
  duration?: number;
  className?: string;
}
