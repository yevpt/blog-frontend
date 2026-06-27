import type { ReactNode } from "react";
import { cn } from "@repo/ui";
import { CIRCLE_GRID_SHELL_CLASS } from "./circle-grid";

interface CircleGridShellProps {
  children: ReactNode;
  className?: string;
  "aria-busy"?: boolean;
  "data-testid"?: string;
}

/** 圈子网格外层：统一控制各断点下的左右留白 */
export function CircleGridShell({
  children,
  className,
  "aria-busy": ariaBusy,
  "data-testid": testId,
}: CircleGridShellProps) {
  return (
    <div
      data-testid={testId}
      className={cn(CIRCLE_GRID_SHELL_CLASS, className)}
      aria-busy={ariaBusy}
    >
      {children}
    </div>
  );
}
