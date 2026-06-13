import type { CSSProperties, ReactNode } from "react";
import { cn } from "./lib/utils";

interface FadeInUpProps {
  children: ReactNode;
  /** 动画延迟（毫秒），默认 0 */
  delay?: number;
  /** 动画时长（毫秒），默认 400 */
  duration?: number;
  className?: string;
}

export function FadeInUp({ children, delay = 0, duration = 400, className }: FadeInUpProps) {
  const style: CSSProperties = {
    ...(delay !== 0 && { animationDelay: `${delay}ms` }),
    ...(duration !== 400 && { animationDuration: `${duration}ms` }),
  };

  return (
    <div className={cn("animate-fade-in-up", className)} style={style}>
      {children}
    </div>
  );
}
