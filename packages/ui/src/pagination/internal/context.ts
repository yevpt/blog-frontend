"use client";

import { createContext, useContext } from "react";
import type { PaginationContextValue } from "../types";

export const PaginationContext = createContext<PaginationContextValue | undefined>(undefined);

/** 读取分页 context；脱离 `Pagination.Root` 使用时抛错。 */
export const usePaginationContext = () => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error("Pagination components must be used within a <Pagination.Root />");
  }
  return context;
};
