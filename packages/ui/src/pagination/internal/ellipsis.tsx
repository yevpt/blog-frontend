"use client";

import type { FC } from "react";
import type { PaginationContextComponentProps, PaginationEllipsisProps } from "../types";
import { usePaginationContext } from "./context";

/** 省略号占位项。 */
export const PaginationEllipsis: FC<PaginationEllipsisProps> = ({ children, style, className }) => {
  const computedClassName = typeof className === "function" ? className() : className;

  return (
    <span style={style} className={computedClassName} aria-hidden="true">
      {children ?? "…"}
    </span>
  );
};

/** 以 render prop 形式向调用方暴露分页 context（页码序列、当前页等）。 */
export const PaginationContextComponent: FC<PaginationContextComponentProps> = ({ children }) => {
  const context = usePaginationContext();
  return <>{children(context)}</>;
};
