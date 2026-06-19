"use client";

import { forwardRef, type ReactNode, type Ref } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Link as AriaLink,
} from "react-aria-components";

import { cn } from "../lib/utils";
import type { ButtonAsButton, ButtonAsLink, ButtonProps } from "./types";
import { buttonVariants } from "./variants";

const loadingSpinner = (
  <span
    role="progressbar"
    aria-label="加载中"
    className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
  />
);

function getButtonContent(children: ReactNode, isLoading: boolean, loadingText?: ReactNode) {
  if (!isLoading) {
    return children;
  }

  if (loadingText !== undefined) {
    return (
      <>
        {loadingSpinner}
        <span>{loadingText}</span>
      </>
    );
  }

  return (
    <>
      <span className="absolute inset-0 flex items-center justify-center">{loadingSpinner}</span>
      <span className="inline-flex items-center justify-center gap-2 opacity-0">{children}</span>
    </>
  );
}

export const Button = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, isLoading = false, loadingText, ...props }, ref) {
    const classes = cn(buttonVariants({ variant, size, className }));
    const content = getButtonContent(props.children, isLoading, loadingText);

    if ("href" in props && props.href !== undefined) {
      const { href, ...rest } = props as ButtonAsLink;
      return (
        <AriaLink
          {...rest}
          href={isLoading ? undefined : href}
          className={classes}
          ref={ref as Ref<HTMLAnchorElement>}
          {...(isLoading ? { "data-disabled": true, "data-pending": true } : {})}
        >
          {content}
        </AriaLink>
      );
    }

    const { isDisabled, ...rest } = props as ButtonAsButton;

    return (
      <AriaButton
        {...(rest as AriaButtonProps)}
        className={classes}
        ref={ref as Ref<HTMLButtonElement>}
        isDisabled={isDisabled || isLoading}
        isPending={isLoading}
      >
        {content}
      </AriaButton>
    );
  },
);
