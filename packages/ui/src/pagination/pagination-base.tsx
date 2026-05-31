"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  type CSSProperties,
  type FC,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type PaginationPage = {
  type: "page";
  value: number;
  isCurrent: boolean;
};

type PaginationEllipsisType = {
  type: "ellipsis";
  key: number;
};

type PaginationItemType = PaginationPage | PaginationEllipsisType;

interface PaginationContextType {
  pages: PaginationItemType[];
  currentPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

const PaginationContext = createContext<PaginationContextType | undefined>(undefined);

export interface PaginationRootProps {
  siblingCount?: number;
  page: number;
  total: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onPageChange?: (page: number) => void;
}

const PaginationRoot = ({
  total,
  siblingCount = 1,
  page,
  onPageChange,
  children,
  style,
  className,
}: PaginationRootProps) => {
  const createPaginationItems = useCallback((): PaginationItemType[] => {
    const items: PaginationItemType[] = [];
    const totalPageNumbers = siblingCount * 2 + 5;

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

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = siblingCount * 2 + 3;
      range(1, leftItemCount).forEach((pageNum) =>
        items.push({ type: "page", value: pageNum, isCurrent: pageNum === page }),
      );
      items.push({ type: "ellipsis", key: leftItemCount + 1 });
      items.push({ type: "page", value: total, isCurrent: total === page });
    } else if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = siblingCount * 2 + 3;
      items.push({ type: "page", value: 1, isCurrent: page === 1 });
      items.push({ type: "ellipsis", key: total - rightItemCount });
      range(total - rightItemCount + 1, total).forEach((pageNum) =>
        items.push({ type: "page", value: pageNum, isCurrent: pageNum === page }),
      );
    } else if (showLeftEllipsis && showRightEllipsis) {
      items.push({ type: "page", value: 1, isCurrent: page === 1 });
      items.push({ type: "ellipsis", key: leftSiblingIndex - 1 });
      range(leftSiblingIndex, rightSiblingIndex).forEach((pageNum) =>
        items.push({ type: "page", value: pageNum, isCurrent: pageNum === page }),
      );
      items.push({ type: "ellipsis", key: rightSiblingIndex + 1 });
      items.push({ type: "page", value: total, isCurrent: total === page });
    }

    return items;
  }, [total, siblingCount, page]);

  // 同步计算页码，避免 useEffect 延迟导致来回点击时高亮/省略号错位
  const pages = useMemo(() => createPaginationItems(), [createPaginationItems]);

  const paginationContextValue: PaginationContextType = {
    pages,
    currentPage: page,
    total,
    onPageChange: (newPage) => onPageChange?.(newPage),
  };

  return (
    <PaginationContext.Provider value={paginationContextValue}>
      <nav aria-label="分页导航" style={style} className={className}>
        {children}
      </nav>
    </PaginationContext.Provider>
  );
};

const range = (start: number, end: number): number[] => {
  const length = end - start + 1;
  return Array.from({ length }, (_, index) => index + start);
};

interface TriggerRenderProps {
  isDisabled: boolean;
  onClick: () => void;
}

interface TriggerProps {
  children: ReactNode | ((props: TriggerRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isDisabled: boolean }) => string);
  asChild?: boolean;
  direction: "prev" | "next";
  ariaLabel?: string;
}

const Trigger: FC<TriggerProps> = ({
  children,
  style,
  className,
  asChild = false,
  direction,
  ariaLabel,
}) => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error("Pagination components must be used within Pagination.Root");
  }

  const { currentPage, total, onPageChange } = context;
  const isDisabled = direction === "prev" ? currentPage <= 1 : currentPage >= total;

  const handleClick = () => {
    if (isDisabled) return;
    const newPage = direction === "prev" ? currentPage - 1 : currentPage + 1;
    onPageChange(newPage);
  };

  const computedClassName = typeof className === "function" ? className({ isDisabled }) : className;
  const defaultAriaLabel = direction === "prev" ? "Previous Page" : "Next Page";

  if (typeof children === "function") {
    return <>{children({ isDisabled, onClick: handleClick })}</>;
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
      disabled: isDisabled,
      "aria-label": ariaLabel || defaultAriaLabel,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className:
        [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className]
          .filter(Boolean)
          .join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel || defaultAriaLabel}
      style={style}
      className={computedClassName}
    >
      {children}
    </button>
  );
};

const PaginationPrevTrigger: FC<Omit<TriggerProps, "direction">> = (props) => (
  <Trigger {...props} direction="prev" />
);

const PaginationNextTrigger: FC<Omit<TriggerProps, "direction">> = (props) => (
  <Trigger {...props} direction="next" />
);

interface PaginationItemRenderProps {
  isSelected: boolean;
  onClick: () => void;
  value: number;
  "aria-current"?: "page";
  "aria-label"?: string;
}

export interface PaginationItemProps {
  value: number;
  isCurrent: boolean;
  children?: ReactNode | ((props: PaginationItemRenderProps) => ReactNode);
  style?: CSSProperties;
  className?: string | ((args: { isSelected: boolean }) => string);
  ariaLabel?: string;
  asChild?: boolean;
}

const PaginationItem = ({
  value,
  isCurrent: _isCurrent,
  children,
  style,
  className,
  ariaLabel,
  asChild = false,
}: PaginationItemProps) => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error("Pagination components must be used within Pagination.Root");
  }

  const { currentPage, onPageChange } = context;
  // 始终以 context 中的 currentPage 为准，避免 pages 数组滞后
  const isSelected = value === currentPage;

  const handleClick = () => {
    if (isSelected) return;
    onPageChange(value);
  };

  const computedClassName = typeof className === "function" ? className({ isSelected }) : className;
  const itemAriaLabel = ariaLabel || `Page ${value}`;

  if (typeof children === "function") {
    return (
      <>
        {children({
          isSelected,
          onClick: handleClick,
          value,
          "aria-current": isSelected ? "page" : undefined,
          "aria-label": itemAriaLabel,
        })}
      </>
    );
  }

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: handleClick,
      "aria-current": isSelected ? "page" : undefined,
      "aria-label": itemAriaLabel,
      style: { ...(children.props as HTMLAttributes<HTMLElement>).style, ...style },
      className:
        [computedClassName, (children.props as HTMLAttributes<HTMLElement>).className]
          .filter(Boolean)
          .join(" ") || undefined,
    } as HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isSelected ? "page" : undefined}
      aria-label={itemAriaLabel}
      style={style}
      className={computedClassName}
    >
      {children ?? value}
    </button>
  );
};

interface PaginationEllipsisProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string | (() => string);
}

const PaginationEllipsis: FC<PaginationEllipsisProps> = ({ children, style, className }) => {
  const computedClassName = typeof className === "function" ? className() : className;

  return (
    <span style={style} className={computedClassName} aria-hidden>
      {children ?? "…"}
    </span>
  );
};

interface PaginationContextComponentProps {
  children: (pagination: PaginationContextType) => ReactNode;
}

const PaginationContextComponent: FC<PaginationContextComponentProps> = ({ children }) => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error("Pagination components must be used within Pagination.Root");
  }

  return <>{children(context)}</>;
};

export const PaginationBase = {
  Root: PaginationRoot,
  PrevTrigger: PaginationPrevTrigger,
  NextTrigger: PaginationNextTrigger,
  Item: PaginationItem,
  Ellipsis: PaginationEllipsis,
  Context: PaginationContextComponent,
};
