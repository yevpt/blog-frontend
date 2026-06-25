import type { ReactNode } from "react";
import { cn } from "@repo/ui";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** 后台页面统一页头：标题基线、说明文案与右侧操作在所有模块保持一致。 */
export function AdminPageHeader({ title, description, action, className }: AdminPageHeaderProps) {
  return (
    <header
      aria-label={`${title}页头`}
      className={cn(
        "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 pr-14 sm:pr-0">
        <h1 className="text-xl font-semibold leading-8 tracking-normal text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-muted-foreground sm:block">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex min-w-0 sm:justify-end">{action}</div> : null}
    </header>
  );
}
