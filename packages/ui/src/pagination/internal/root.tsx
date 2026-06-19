"use client";

import { usePaginationItems } from "../hooks/use-pagination-items";
import type { PaginationContextValue, PaginationRootProps } from "../types";
import { PaginationContext } from "./context";

/** 分页根容器：计算页码序列、注入 context、渲染 nav。 */
export const PaginationRoot = ({
  total,
  siblingCount = 1,
  page,
  onPageChange,
  children,
  style,
  className,
}: PaginationRootProps) => {
  const pages = usePaginationItems({ total, page, siblingCount });

  const contextValue: PaginationContextValue = {
    pages,
    currentPage: page,
    total,
    onPageChange: (newPage: number) => onPageChange?.(newPage),
  };

  return (
    <PaginationContext.Provider value={contextValue}>
      <nav aria-label="分页导航" style={style} className={className}>
        {children}
      </nav>
    </PaginationContext.Provider>
  );
};
