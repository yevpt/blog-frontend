"use client";

import { useMemo } from "react";
import type { PaginationItemType } from "../types";
import { range } from "../utils/range";

interface UsePaginationItemsParams {
  total: number;
  page: number;
  siblingCount: number;
}

/**
 * 根据当前页、总页数与相邻页数，计算页码 + 省略号序列。
 * 同步计算（useMemo），避免 useEffect 延迟导致来回翻页时高亮/省略号错位。
 */
export const usePaginationItems = ({
  total,
  page,
  siblingCount,
}: UsePaginationItemsParams): PaginationItemType[] => {
  return useMemo(() => {
    const items: PaginationItemType[] = [];
    // 需要展示的最大元素数（页码 + 潜在省略号 + 首尾页）
    const totalPageNumbers = siblingCount * 2 + 5;

    // 元素数 ≥ 总页数：直接列出全部页码，无需省略号
    if (totalPageNumbers >= total) {
      for (let i = 1; i <= total; i++) {
        items.push({ type: "page", value: i, isCurrent: i === page });
      }
      return items;
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, total);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < total - 1;

    // 情况 1：仅右侧需要省略号
    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = siblingCount * 2 + 3;
      range(1, leftItemCount).forEach((pageNum) =>
        items.push({ type: "page", value: pageNum, isCurrent: pageNum === page }),
      );
      items.push({ type: "ellipsis", key: leftItemCount + 1 });
      items.push({ type: "page", value: total, isCurrent: total === page });
    }
    // 情况 2：仅左侧需要省略号
    else if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = siblingCount * 2 + 3;
      items.push({ type: "page", value: 1, isCurrent: page === 1 });
      items.push({ type: "ellipsis", key: total - rightItemCount });
      range(total - rightItemCount + 1, total).forEach((pageNum) =>
        items.push({ type: "page", value: pageNum, isCurrent: pageNum === page }),
      );
    }
    // 情况 3：两侧都需要省略号
    else if (showLeftEllipsis && showRightEllipsis) {
      items.push({ type: "page", value: 1, isCurrent: page === 1 });
      items.push({ type: "ellipsis", key: leftSiblingIndex - 1 });
      range(leftSiblingIndex, rightSiblingIndex).forEach((pageNum) =>
        items.push({ type: "page", value: pageNum, isCurrent: pageNum === page }),
      );
      items.push({ type: "ellipsis", key: rightSiblingIndex + 1 });
      items.push({ type: "page", value: total, isCurrent: total === page });
    }

    return items;
  }, [total, page, siblingCount]);
};
