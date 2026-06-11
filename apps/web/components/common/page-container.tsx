import type { ReactNode } from "react";
import { cn } from "@repo/ui";

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
    <div
      data-testid={testId}
      className={cn(
        "relative mx-auto px-5",
        "pb-20 pt-20 md:pt-24", // 默认上下边距，会被 className 中的明确设置覆盖
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
