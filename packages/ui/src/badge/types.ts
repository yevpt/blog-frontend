import type { HTMLAttributes } from "react";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "./variants";

/** `Badge` 的 props。 */
export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;
