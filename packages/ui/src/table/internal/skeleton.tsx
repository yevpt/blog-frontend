"use client";

import { Cell, Row } from "react-aria-components";
import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableColumn } from "../types";

// 不同宽度的灰条，按 (行+列) 索引轮换，制造轻微错落，避免骨架过于规整；
// 取值确定性，便于测试断言。
const SKELETON_BAR_WIDTHS = ["w-3/4", "w-1/2", "w-5/6", "w-2/3"] as const;

interface RenderSkeletonRowsParams<T extends object> {
  columns: Array<DataTableColumn<T>>;
  rows: number;
  classNames?: DataTableClassNames;
}

/**
 * 生成首屏加载用的骨架行。使用真实的 react-aria `Row`/`Cell`，
 * 保证列宽与对齐和数据行完全一致；灰条用 `animate-pulse` 占位。
 */
export function renderSkeletonRows<T extends object>({
  columns,
  rows,
  classNames,
}: RenderSkeletonRowsParams<T>) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <Row
      key={`__skeleton-${rowIndex}`}
      id={`__skeleton-${rowIndex}`}
      className={cn("group/row select-none", classNames?.row)}
    >
      {columns.map((column, colIndex) => (
        <Cell
          key={column.id}
          className={cn(
            "border-b border-border px-3 py-2.5 align-middle",
            "group-last/row:border-b-0",
            classNames?.cell,
            column.className,
          )}
        >
          <span
            data-skeleton-bar
            className={cn(
              "block h-4 animate-pulse rounded bg-muted",
              SKELETON_BAR_WIDTHS[(rowIndex + colIndex) % SKELETON_BAR_WIDTHS.length],
            )}
          />
        </Cell>
      ))}
    </Row>
  ));
}
