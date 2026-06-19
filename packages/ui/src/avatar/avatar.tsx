"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "../lib/utils";
import { AvatarOnlineIndicator, VerifiedTick } from "./internal";
import { AvatarCount } from "./internal/avatar-count";
import type { AvatarProps } from "./types";

const iconSizes: Record<string, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  "2xl": 32,
};

const rootSizes: Record<string, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-14",
  "2xl": "size-16",
};

const rootBorderPadding: Record<string, string> = {
  xs: "p-px",
  sm: "p-px",
  md: "p-px",
  lg: "p-[1.5px]",
  xl: "p-0.5",
  "2xl": "p-0.5",
};

const initialsClasses: Record<string, string> = {
  xs: "text-xs font-semibold",
  sm: "text-sm font-semibold",
  md: "text-base font-semibold",
  lg: "text-lg font-semibold",
  xl: "text-xl font-semibold",
  "2xl": "text-2xl font-semibold",
};

export const Avatar = ({
  size = "md",
  src,
  alt,
  initials,
  placeholder,
  placeholderIcon: PlaceholderIcon,
  border,
  badge,
  status,
  verified,
  count,
  focusable = false,
  rounded = true,
  className,
  contentClassName,
}: AvatarProps) => {
  const [isFailed, setIsFailed] = useState(false);
  const canShowImage = src && !isFailed;

  const renderMain = () => {
    if (canShowImage)
      return (
        <img
          data-avatar-img
          className="size-full object-cover"
          src={src}
          alt={alt}
          onError={() => setIsFailed(true)}
        />
      );
    if (initials)
      return <span className={cn("text-muted-foreground", initialsClasses[size])}>{initials}</span>;
    if (PlaceholderIcon) return <PlaceholderIcon className="text-muted-foreground" />;
    return placeholder || <SvgIcon name="user" size={iconSizes[size]} />;
  };

  const renderBadge = () => {
    if (status) return <AvatarOnlineIndicator status={status} size={size} />;
    if (verified)
      return (
        <VerifiedTick
          size={size}
          className={cn("absolute right-0 bottom-0", size === "xs" && "-right-px -bottom-px")}
        />
      );
    if (count) return <AvatarCount count={count} />;
    return badge;
  };

  return (
    <div
      data-avatar
      className={cn(
        "relative inline-flex shrink-0 rounded-[7px]",
        rounded && "rounded-full",
        focusable &&
          "outline-transparent group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
        border && "ring-1 ring-border",
        border && rootBorderPadding[size],
        rootSizes[size],
        className,
      )}
    >
      <div
        className={cn(
          "relative inline-flex size-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted outline-[0.5px] -outline-offset-[0.5px] outline-border",
          rounded && "rounded-full",
          contentClassName,
        )}
      >
        {renderMain()}
      </div>
      {renderBadge()}
    </div>
  );
};
