"use client";

import { useState } from "react";
import { cn } from "@repo/ui";

const SIZE = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-[22px] w-[22px] text-[10px]",
  md: "h-7 w-7 text-xs",
} as const;

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export function UserAvatar({ src, name, size = "md", className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const base = cn("shrink-0 rounded-full overflow-hidden", SIZE[size], className);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(base, "object-cover")}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={cn(base, "flex items-center justify-center bg-border font-bold text-(--fg2)")}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
