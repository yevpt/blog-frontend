import type { HTMLAttributes } from "react";
import { Button, cn, type ButtonAsButton } from "@repo/ui";

export const adminRowActionClassName =
  "h-7 rounded-md px-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-muted/70 hover:text-foreground";

interface AdminRowActionProps extends Omit<ButtonAsButton, "className" | "size" | "variant"> {
  tone?: "neutral" | "destructive";
  className?: string;
}

/** 后台列表行内操作：统一紧凑尺寸、低噪声色彩与危险态反馈。 */
export function AdminRowAction({ tone = "neutral", className, ...props }: AdminRowActionProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn(
        adminRowActionClassName,
        tone === "destructive" &&
          "text-destructive/80 hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

/** 操作列容器：所有桌面表格统一靠右收口，移动端可透传布局覆盖。 */
export function AdminRowActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-0.5", className)} {...props} />;
}
