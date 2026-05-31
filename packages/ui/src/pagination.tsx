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

  const pages: (number | "...")[] = [];

  // 始终显示第 1 页
  pages.push(1);

  // 当前页左侧省略号：当前页距第 1 页超过 3 格时出现
  if (currentPage > 3) {
    pages.push("...");
  }

  // 当前页附近的页码（当前页 -1、当前页、当前页 +1），去掉首尾已有的
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // 当前页右侧省略号：当前页距最后页超过 3 格时出现
  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  // 始终显示最后一页
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
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isPrevDisabled}
        aria-label="上一页"
      >
        <SvgIcon name="chevron-left" size={16} />
      </Button>

      {/* 页码列表 */}
      {pageNumbers.map((page, index) =>
        page === "..." ? (
          // 省略号占位，key 用 index 因为省略号本身无唯一标识
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
            onClick={() => onPageChange(page)}
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
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isNextDisabled}
        aria-label="下一页"
      >
        <SvgIcon name="chevron-right" size={16} />
      </Button>
    </nav>
  );
}
