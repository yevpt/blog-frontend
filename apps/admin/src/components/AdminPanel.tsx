import type { HTMLAttributes, ReactNode } from "react";
import { Card, CardContent, cn } from "@repo/ui";

export interface AdminPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
}

/** 后台内容面板：统一细边框、标题层级、操作区与内容留白。 */
export function AdminPanel({
  title,
  description,
  action,
  headerClassName,
  contentClassName,
  className,
  children,
  ...props
}: AdminPanelProps) {
  const hasHeader = title !== undefined || description !== undefined || action !== undefined;

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/70 bg-card/90 shadow-card backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <header
          className={cn(
            "flex min-w-0 flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title !== undefined ? (
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            ) : null}
            {description !== undefined ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action !== undefined ? <div className="min-w-0 shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <CardContent className={cn("p-4 sm:p-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
