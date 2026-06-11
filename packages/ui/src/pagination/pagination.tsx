"use client";

import { SvgIcon } from "@repo/icons";

import { cn } from "../lib/utils";
import { PaginationBase } from "./pagination-base";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
}

const navButtonClassName = (isDisabled: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium",
    "border border-input bg-background shadow-sm transition-colors cursor-pointer select-none",
    "hover:bg-accent hover:text-accent-foreground",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    isDisabled && "pointer-events-none opacity-50 cursor-not-allowed",
  );

interface PaginationPageNumberProps {
  value: number;
  isCurrent: boolean;
}

/** 页码按钮，与 Untitled UI PaginationItem 一致使用 PaginationBase.Item 的默认 Button */
function PaginationPageNumber({ value, isCurrent }: PaginationPageNumberProps) {
  return (
    <PaginationBase.Item
      value={value}
      isCurrent={isCurrent}
      ariaLabel={`第 ${value} 页`}
      className={({ isSelected }) =>
        cn(
          "flex size-9 cursor-pointer items-center justify-center rounded-lg p-3 text-sm font-medium",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          // 仅选中态有背景色；不用 transition/hover 背景，避免切换页码时旧页闪烁
          isSelected
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {value}
    </PaginationBase.Item>
  );
}

/**
 * Untitled UI「Page default」分页：桌面端显示页码按钮，移动端显示摘要文字。
 * @see https://www.untitledui.com/react/components/pagination
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  prevLabel = "上一页",
  nextLabel = "下一页",
}: PaginationProps) {
  return (
    <PaginationBase.Root
      page={currentPage}
      total={totalPages}
      onPageChange={onPageChange}
      className={cn(
        "flex w-full items-center justify-between gap-3 border-t border-border pt-4 md:pt-5",
        className,
      )}
    >
      <PaginationBase.PrevTrigger
        ariaLabel="上一页"
        className={({ isDisabled }) => navButtonClassName(isDisabled)}
      >
        <SvgIcon name="chevron-left" size={16} />
        <span className="hidden md:inline">{prevLabel}</span>
      </PaginationBase.PrevTrigger>

      <PaginationBase.Context>
        {({ pages, currentPage: page, total }) => (
          <>
            {/* 桌面端：页码列表 */}
            <div className="hidden justify-center gap-0.5 md:flex">
              {pages.map((item, index) =>
                item.type === "page" ? (
                  <PaginationPageNumber key={`page-${item.value}`} {...item} />
                ) : (
                  <PaginationBase.Ellipsis
                    key={`ellipsis-${index}`}
                    className="flex size-9 shrink-0 items-center justify-center text-muted-foreground"
                  />
                ),
              )}
            </div>

            {/* 移动端：Page X of Y */}
            <div
              data-testid="pagination-mobile-summary"
              className="flex justify-center text-sm whitespace-nowrap text-muted-foreground md:hidden"
            >
              第 <span className="font-medium text-foreground">{page}</span> /{" "}
              <span className="font-medium text-foreground">{total}</span> 页
            </div>
          </>
        )}
      </PaginationBase.Context>

      <PaginationBase.NextTrigger
        ariaLabel="下一页"
        className={({ isDisabled }) => navButtonClassName(isDisabled)}
      >
        <span className="hidden md:inline">{nextLabel}</span>
        <SvgIcon name="chevron-right" size={16} />
      </PaginationBase.NextTrigger>
    </PaginationBase.Root>
  );
}

export { PaginationBase };
