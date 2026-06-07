"use client";

import { forwardRef, type CSSProperties, type ReactNode, type Ref } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-colors cursor-pointer select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "data-[pending]:pointer-events-none data-[pending]:opacity-70",
    "data-[pressed]:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground active:text-accent-foreground",
        text: "text-foreground active:text-accent-foreground hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
    compoundVariants: [
      {
        variant: "text",
        size: ["default", "sm", "lg"],
        class: "h-auto px-0 py-0",
      },
    ],
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
  loadingText?: ReactNode;
  style?: CSSProperties;
  tabIndex?: number;
};

/** 带 href：渲染为 React Aria Link（锚点语义） */
type ButtonAsLink = ButtonBaseProps &
  Omit<AriaLinkProps, "children" | "className" | "style"> & { href: string };

/** 不带 href：渲染为 React Aria Button（按钮语义） */
type ButtonAsButton = ButtonBaseProps &
  Omit<AriaButtonProps, "children" | "className" | "style"> & { href?: never };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

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
