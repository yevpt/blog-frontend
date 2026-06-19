import { cn } from "../lib/utils";
import type { BadgeProps } from "./types";
import { badgeVariants } from "./variants";

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
