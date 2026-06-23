import type { ReactNode } from "react";
import { cn } from "@repo/ui";

const MAX_STAGGER_DELAY_MS = 360;
const STAGGER_STEP_MS = 45;

interface NotificationCardMotionProps {
  children: ReactNode;
  /** 列表序号，用于首屏/加载更多的阶梯延迟 */
  staggerIndex: number;
  /** SSE 实时插入时使用更醒目的自顶滑入动画 */
  entering?: boolean;
  /** 本次会话内首次出现时才播放阶梯 fade-in-up */
  staggerAnimate?: boolean;
}

export function NotificationCardMotion({
  children,
  staggerIndex,
  entering = false,
  staggerAnimate = false,
}: NotificationCardMotionProps) {
  if (!entering && !staggerAnimate) {
    return <div>{children}</div>;
  }

  return (
    <div
      className={cn(entering ? "animate-notification-enter" : "animate-fade-in-up")}
      style={
        entering
          ? undefined
          : {
              animationDelay: `${Math.min(staggerIndex * STAGGER_STEP_MS, MAX_STAGGER_DELAY_MS)}ms`,
            }
      }
    >
      {children}
    </div>
  );
}
