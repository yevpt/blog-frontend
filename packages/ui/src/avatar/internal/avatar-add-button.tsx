"use client";
import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { Tooltip, TooltipTrigger } from "../../tooltip/tooltip";
import { cn } from "../../lib/utils";

const sizes = {
  xs: { root: "size-6", iconSize: 16 as const },
  sm: { root: "size-8", iconSize: 16 as const },
  md: { root: "size-10", iconSize: 20 as const },
};

interface AvatarAddButtonProps extends AriaButtonProps {
  size: "xs" | "sm" | "md";
  title?: string;
  className?: string;
}

export const AvatarAddButton = ({
  size,
  className,
  title = "Add user",
  ...props
}: AvatarAddButtonProps) => (
  <Tooltip title={title}>
    <TooltipTrigger
      {...props}
      aria-label={title}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full border border-dashed border-input bg-card text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        sizes[size].root,
        className,
      )}
    >
      <SvgIcon name="plus" size={sizes[size].iconSize} />
    </TooltipTrigger>
  </Tooltip>
);
