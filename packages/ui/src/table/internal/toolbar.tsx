"use client";

import { SearchField } from "../../search-field";
import { cn } from "../../lib/utils";
import type { DataTableClassNames, DataTableSearch } from "../types";

export function DataTableToolbar<T>({
  search,
  searchValue,
  total,
  onSearchChange,
  classNames,
}: {
  search?: DataTableSearch<T>;
  searchValue: string;
  total: number;
  onSearchChange: (value: string) => void;
  classNames?: DataTableClassNames;
}) {
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
      <p className={cn("text-sm text-muted-foreground", classNames?.resultCount)}>共 {total} 条</p>
    </div>
  );
}
