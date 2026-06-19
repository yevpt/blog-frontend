"use client";

import type { ReactNode } from "react";
import { SearchField } from "../../search-field";
import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableSearch } from "../types";

export function DataTableToolbar<T>({
  search,
  searchValue,
  total,
  showTotal,
  actions,
  onSearchChange,
  classNames,
}: {
  search?: DataTableSearch<T>;
  searchValue: string;
  total: number;
  showTotal: boolean;
  actions?: ReactNode;
  onSearchChange: (value: string) => void;
  classNames?: DataTableClassNames;
}) {
  // 右侧聚合「总数 + 操作区」；两者都为空时不渲染，搜索框靠左独占一行
  const hasTrailing = showTotal || Boolean(actions);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        classNames?.toolbar,
      )}
    >
      {search ? (
        <SearchField
          aria-label={search.placeholder ?? "搜索"}
          placeholder={search.placeholder ?? "搜索"}
          value={searchValue}
          onChange={onSearchChange}
          className={cn("max-w-md", classNames?.search)}
        />
      ) : (
        <span aria-hidden="true" />
      )}
      {hasTrailing ? (
        <div className={cn("flex items-center gap-3", classNames?.actions)}>
          {showTotal ? (
            <p className={cn("text-sm text-muted-foreground", classNames?.resultCount)}>
              共 {total} 条
            </p>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
