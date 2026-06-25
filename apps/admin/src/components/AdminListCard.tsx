import type { HTMLAttributes } from "react";
import { Card, cn } from "@repo/ui";

/** 后台列表页外框：基于 @repo/ui Card，单层边框 + 背景，避免 ring/嵌套底色在圆角露缝。 */
export function AdminListCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={cn(
        "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col divide-y divide-border/70 overflow-hidden border border-border/80 shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
