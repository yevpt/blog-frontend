import type { FC, ReactNode } from "react";

/** 头像尺寸档位。 */
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/** `Avatar` 的 props。 */
export interface AvatarProps {
  size?: AvatarSize;
  className?: string;
  contentClassName?: string;
  src?: string | null;
  alt?: string;
  contrastBorder?: boolean;
  rounded?: boolean;
  border?: boolean;
  badge?: ReactNode;
  status?: "online" | "offline";
  verified?: boolean;
  count?: number;
  initials?: string;
  placeholderIcon?: FC<{ className?: string }>;
  placeholder?: ReactNode;
  focusable?: boolean;
}
