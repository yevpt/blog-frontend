"use client";
import { cn } from "../../lib/utils";

interface AvatarCountProps {
  count: number;
  className?: string;
}

export const AvatarCount = ({ count, className }: AvatarCountProps) => (
  <div className={cn("absolute right-0 bottom-0 p-px", className)}>
    <div className="flex size-3.5 items-center justify-center rounded-full bg-destructive text-center text-[10px] leading-[13px] font-bold text-destructive-foreground">
      {count}
    </div>
  </div>
);
