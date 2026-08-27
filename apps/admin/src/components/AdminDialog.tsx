import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@repo/ui";

export const adminDialogTextareaClassName =
  "box-border w-full resize-y rounded-lg border border-input bg-background/85 px-3 py-2.5 text-sm leading-6 text-foreground shadow-xs outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 hover:border-border focus-visible:border-ring/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

export const adminDialogSectionClassName =
  "rounded-xl border border-border/70 bg-muted/10 p-4 shadow-none";

export function AdminDialogFrame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  );
}

interface AdminDialogHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
}

export function AdminDialogHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  ...props
}: AdminDialogHeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-start gap-4 border-b border-border/70 bg-card/95 px-4 py-4 sm:px-6 sm:py-5",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {eyebrow !== undefined ? (
          <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description !== undefined ? (
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action !== undefined ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

interface AdminDialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  contentClassName?: string;
  inset?: boolean;
  scrollable?: boolean;
}

export function AdminDialogBody({
  inset = true,
  scrollable = true,
  className,
  contentClassName,
  children,
  ...props
}: AdminDialogBodyProps) {
  return (
    <div
      className={cn(
        "min-h-0 min-w-0 flex-1",
        scrollable && "overflow-x-hidden overflow-y-auto overscroll-y-contain",
        className,
      )}
      {...props}
    >
      {inset ? (
        <div className={cn("px-4 py-5 sm:px-6 sm:py-6", contentClassName)}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

export function AdminDialogFooter({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <footer
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-border/70 bg-muted/15 px-4 py-3.5 [&>button]:w-full sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4 sm:[&>button]:w-auto",
        className,
      )}
      {...props}
    />
  );
}
