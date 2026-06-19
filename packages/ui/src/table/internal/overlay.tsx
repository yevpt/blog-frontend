"use client";

import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableProps } from "../types";

interface DataTableOverlayProps {
  loadingText: DataTableProps<object>["loadingText"];
  classNames?: DataTableClassNames;
}

/**
 * 翻页 / 刷新（已有数据）时叠加的半透明遮罩 + spinner，旧行保持可见。
 * 复用 Button 的纯 CSS 圆环 spinner，无图标依赖。挂在 `relative` 的容器内。
 */
export function DataTableOverlay({ loadingText, classNames }: DataTableOverlayProps) {
  const label = typeof loadingText === "string" ? loadingText : "加载中";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2",
        "bg-card/60 backdrop-blur-[1px]",
        classNames?.overlay,
      )}
    >
      <span
        role="progressbar"
        aria-label={label}
        className="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
      />
      {loadingText ? <span className="text-sm text-muted-foreground">{loadingText}</span> : null}
    </div>
  );
}
