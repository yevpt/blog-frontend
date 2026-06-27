import type { ReactNode } from "react";
import { cn } from "@repo/ui";
import { FloatDockPageAnchor } from "@/components/float-dock";
import { pageContainerFloatDockLayout } from "@/lib/float-dock-layouts";

interface PageContainerProps {
  children: ReactNode;
  size?: "narrow" | "default" | "wide";
  className?: string;
  ["data-testid"]?: string;
}

const sizeClasses = {
  narrow: "max-w-[680px]",
  default: "max-w-[960px]",
  wide: "max-w-[1120px]",
};

export function PageContainer({
  children,
  size = "default",
  className,
  "data-testid": testId,
}: PageContainerProps) {
  return (
    <>
      <FloatDockPageAnchor layout={pageContainerFloatDockLayout(size)} />
      <div
        data-testid={testId}
        className={cn("relative mx-auto px-5", "pb-20 pt-24", sizeClasses[size], className)}
      >
        {children}
      </div>
    </>
  );
}
