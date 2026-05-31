"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "./button";
import { cn } from "./lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * 计算需要显示的页码序列。
 * 总页数 ≤ 7 时显示全部；> 7 时在当前页附近显示 3 个，并在两侧用省略号连接首尾页。
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (currentPage > 3) pages.push("...");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);

  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="分页导航"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* 上一页按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onPress={() => onPageChange(currentPage - 1)}
        isDisabled={isPrevDisabled}
        aria-label="上一页"
      >
        <SvgIcon name="chevron-left" size={16} />
      </Button>

      {/* 页码列表 */}
      {pageNumbers.map((page, index) =>
        page === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="sm"
            onPress={() => onPageChange(page)}
            aria-label={`第 ${page} 页`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        ),
      )}

      {/* 下一页按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onPress={() => onPageChange(currentPage + 1)}
        isDisabled={isNextDisabled}
        aria-label="下一页"
      >
        <SvgIcon name="chevron-right" size={16} />
      </Button>
    </nav>
  );
}
