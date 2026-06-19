"use client";

import { PaginationContextComponent, PaginationEllipsis } from "./internal/ellipsis";
import { PaginationItem } from "./internal/item";
import { PaginationRoot } from "./internal/root";
import { PaginationNextTrigger, PaginationPrevTrigger } from "./internal/trigger";

/** 无样式的复合分页原语，通过命名空间属性组合各部分。 */
export const PaginationBase = {
  Root: PaginationRoot,
  PrevTrigger: PaginationPrevTrigger,
  NextTrigger: PaginationNextTrigger,
  Item: PaginationItem,
  Ellipsis: PaginationEllipsis,
  Context: PaginationContextComponent,
};
