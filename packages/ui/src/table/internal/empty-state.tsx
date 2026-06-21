"use client";

import { SvgIcon } from "@repo/icons";
import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableEmptyState } from "../types";
import type { ReactNode } from "react";

interface DataTableEmptyStateViewProps {
  emptyState?: DataTableEmptyState;
  emptyText?: ReactNode;
  classNames?: DataTableClassNames;
}

function renderIcon(icon: DataTableEmptyState["icon"]) {
  if (icon === false) return null;

  if (typeof icon === "string") {
    return <SvgIcon name={icon} size={22} />;
  }

  return icon ?? <SvgIcon name="folder" size={22} />;
}

export function DataTableEmptyStateView({
  emptyState,
  emptyText,
  classNames,
}: DataTableEmptyStateViewProps) {
  const title = emptyState?.title ?? emptyText ?? "暂无数据";
  const description = emptyState?.description ?? "添加数据后会显示在这里。";
  const icon = renderIcon(emptyState?.icon);

  return (
    <div
      className={cn(
        "flex min-h-[220px] w-full flex-col items-center justify-center px-6 py-12 text-center not-italic",
        classNames?.emptyState,
      )}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            "mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-sm",
            classNames?.emptyStateIcon,
          )}
        >
          {icon}
        </div>
      ) : null}
      <div
        className={cn("text-sm font-medium leading-6 text-foreground", classNames?.emptyStateTitle)}
      >
        {title}
      </div>
      {description ? (
        <div
          className={cn(
            "mt-1 max-w-sm text-sm leading-6 text-muted-foreground",
            classNames?.emptyStateDescription,
          )}
        >
          {description}
        </div>
      ) : null}
      {emptyState?.action ? (
        <div className={cn("mt-5", classNames?.emptyStateAction)}>{emptyState.action}</div>
      ) : null}
    </div>
  );
}
