import type { CSSProperties } from "react";
import { cn } from "../lib/utils";
import type { FadeInUpProps } from "./types";

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
