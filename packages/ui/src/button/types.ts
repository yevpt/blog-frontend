import type { CSSProperties, ReactNode } from "react";
import type {
  ButtonProps as AriaButtonProps,
  LinkProps as AriaLinkProps,
} from "react-aria-components";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "./variants";

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
  loadingText?: ReactNode;
  style?: CSSProperties;
  tabIndex?: number;
};

/** 带 href：渲染为 React Aria Link（锚点语义） */
export type ButtonAsLink = ButtonBaseProps &
  Omit<AriaLinkProps, "children" | "className" | "style"> & { href: string };

/** 不带 href：渲染为 React Aria Button（按钮语义） */
export type ButtonAsButton = ButtonBaseProps &
  Omit<AriaButtonProps, "children" | "className" | "style"> & { href?: never };

/** `Button` 的 props，按是否传 href 在 link / button 两种语义间二选一。 */
export type ButtonProps = ButtonAsButton | ButtonAsLink;
