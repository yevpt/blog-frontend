import type { CSSProperties, ReactNode } from "react";

/** 普通页码项。 */
export type PaginationPage = {
  type: "page";
  value: number;
  isCurrent: boolean;
};

/** 省略号项。 */
export type PaginationEllipsisType = {
  type: "ellipsis";
  key: number;
};

/** 分页项联合类型。 */
export type PaginationItemType = PaginationPage | PaginationEllipsisType;

/** 透过 context 共享的分页状态。 */
export interface PaginationContextValue {
  /** 计算好的分页项序列。 */
  pages: PaginationItemType[];
  /** 当前页。 */
  currentPage: number;
  /** 总页数。 */
  total: number;
  /** 翻页回调。 */
  onPageChange: (page: number) => void;
}

/** `Pagination.Root` 的 props。 */
export interface PaginationRootProps {
  /** 当前页两侧各保留的相邻页数。 */
  siblingCount?: number;
  /** 当前页码。 */
  page: number;
  /** 总页数。 */
  total: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onPageChange?: (page: number) => void;
}

/** 传给 Trigger 渲染函数的运行时状态。 */
export interface PaginationTriggerRenderProps {
  isDisabled: boolean;
  onClick: () => void;
}

/** `Pagination.PrevTrigger` / `Pagination.NextTrigger` 的 props。 */
export interface PaginationTriggerProps {
  children: ReactNode | ((props: PaginationTriggerRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isDisabled: boolean }) => string);
  asChild?: boolean;
  direction: "prev" | "next";
  ariaLabel?: string;
}

/** 传给 Item 渲染函数的运行时状态。 */
export interface PaginationItemRenderProps {
  isSelected: boolean;
  onClick: () => void;
  value: number;
  "aria-current"?: "page";
  "aria-label"?: string;
}

/** `Pagination.Item` 的 props。 */
export interface PaginationItemProps {
  value: number;
  isCurrent: boolean;
  children?: ReactNode | ((props: PaginationItemRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isSelected: boolean }) => string);
  ariaLabel?: string;
  asChild?: boolean;
}

/** `Pagination.Ellipsis` 的 props。 */
export interface PaginationEllipsisProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string | (() => string);
}

/** `Pagination.Context` 渲染函数 props。 */
export interface PaginationContextComponentProps {
  children: (pagination: PaginationContextValue) => ReactNode;
}

/** 样式化高层 `Pagination` 组件的 props。 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
}
