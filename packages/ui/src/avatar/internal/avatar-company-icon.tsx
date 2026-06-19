"use client";
import { cn } from "../../lib/utils";

const sizes = {
  xs: "size-2",
  sm: "size-3",
  md: "size-3.5",
  lg: "size-4",
  xl: "size-4.5",
  "2xl": "size-5",
};

interface AvatarCompanyIconProps {
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  src: string;
  alt?: string;
}

export const AvatarCompanyIcon = ({ size, src, alt }: AvatarCompanyIconProps) => (
  <img
    src={src}
    alt={alt}
    className={cn(
      "absolute -right-0.5 -bottom-0.5 rounded-full bg-primary/10 object-cover ring-[1.5px] ring-background",
      sizes[size],
    )}
  />
);
