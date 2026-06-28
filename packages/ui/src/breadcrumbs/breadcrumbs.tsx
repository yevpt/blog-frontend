"use client";

import {
  Breadcrumb as AriaBreadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link as AriaLink,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";

import { cn } from "../lib/utils";
import type { BreadcrumbItemProps, BreadcrumbsProps } from "./types";

const breadcrumbLinkClassName = cn(
  "rounded-sm text-sm text-muted-foreground outline-none transition-colors",
  "hover:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  "data-[current]:font-medium data-[current]:text-foreground",
  "data-[disabled]:cursor-default data-[disabled]:text-muted-foreground",
);

export function Breadcrumbs({
  children,
  className,
  "aria-label": ariaLabel = "面包屑导航",
}: BreadcrumbsProps) {
  return (
    <nav aria-label={ariaLabel} className={cn("min-w-0", className)}>
      <AriaBreadcrumbs className="flex flex-wrap items-center gap-1">{children}</AriaBreadcrumbs>
    </nav>
  );
}

export function BreadcrumbItem({ children, className, href, ...linkProps }: BreadcrumbItemProps) {
  const hasHref = href != null && href !== "";

  return (
    <AriaBreadcrumb className={cn("flex items-center gap-1", className)}>
      {({ isCurrent }) => (
        <>
          {hasHref && !isCurrent ? (
            <AriaLink href={href} className={breadcrumbLinkClassName} {...linkProps}>
              {children}
            </AriaLink>
          ) : (
            <span
              aria-current={isCurrent ? "page" : undefined}
              className={cn(breadcrumbLinkClassName, isCurrent && "font-medium text-foreground")}
            >
              {children}
            </span>
          )}
          {!isCurrent ? (
            <SvgIcon name="chevron-right" size={14} className="shrink-0 text-muted-foreground" />
          ) : null}
        </>
      )}
    </AriaBreadcrumb>
  );
}
