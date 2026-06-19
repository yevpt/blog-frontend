"use client";
import { cn } from "../../lib/utils";

const sizes = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
  xl: "size-3.5",
  "2xl": "size-4",
};

interface AvatarOnlineIndicatorProps {
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status: "online" | "offline";
  className?: string;
}

export const AvatarOnlineIndicator = ({ size, status, className }: AvatarOnlineIndicatorProps) => (
  <span
    className={cn(
      "absolute right-0 bottom-0 flex justify-center rounded-full ring-[1.5px] ring-background",
      status === "online" ? "bg-green-400" : "bg-muted-foreground",
      sizes[size],
      className,
    )}
  />
);
