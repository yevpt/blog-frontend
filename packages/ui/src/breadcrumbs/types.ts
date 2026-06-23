import type { ReactNode } from "react";
import type { LinkProps } from "react-aria-components";

export interface BreadcrumbsProps {
  children: ReactNode;
  className?: string;
  /** nav landmark 的 aria-label，默认「面包屑导航」 */
  "aria-label"?: string;
}

export interface BreadcrumbItemProps extends Omit<LinkProps, "className" | "children"> {
  children: ReactNode;
  className?: string;
}
